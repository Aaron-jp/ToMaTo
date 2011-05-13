# -*- coding: utf-8 -*-
# ToMaTo (Topology management software) 
# Copyright (C) 2010 Dennis Schwerdel, University of Kaiserslautern
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>

from tomato import config
from tomato.hosts import templates
from tomato.generic import State
from tomato.devices import Device, Interface
import hashlib

from tomato.lib import util, vzctl, ifaceutil, hostserver, tasks

class OpenVZDevice(Device):

	class Meta:
		db_table = "tomato_openvzdevice"

	def upcast(self):
		return self

	def init(self):
		self.setTemplate("")
		self.setRootPassword("glabroot")

	def setVmid(self, value):
		self.attributes["vmid"] = value

	def getVmid(self):
		return self.attributes.get("vmid")

	def setVncPort(self, value):
		self.attributes["vnc_port"] = value

	def getVncPort(self):
		return self.attributes.get("vnc_port")

	def setTemplate(self, value):
		self.attributes["template"] = value

	def getTemplate(self):
		return self.attributes["template"]

	def setRootPassword(self, value):
		self.attributes["root_password"] = value

	def getRootPassword(self):
		return self.attributes["root_password"]

	def getState(self):
		if config.remote_dry_run:
			return self.state
		if not self.getVmid() or not self.host:
			return State.CREATED
		return vzctl.getState(self.host, self.getVmid()) 

	def execute(self, cmd):
		assert self.state == State.STARTED, "Device must be running to execute commands on it: %s" % self.name
		return vzctl.execute(self.host, self.getVmid(), cmd)

	def vncPassword(self):
		if not self.getVncPort():
			return None 
		m = hashlib.md5()
		m.update(config.password_salt)
		m.update(str(self.name))
		m.update(str(self.getVmid()))
		m.update(str(self.getVncPort()))
		m.update(str(self.topology.owner))
		return m.hexdigest()
	
	def _startVnc(self):
		if not self.getVncPort():
			self.setVncPort(self.host.nextFreePort())
		vzctl.startVnc(self.host, self.getVmid(), self.getVncPort(), self.vncPassword())

	def _startVm(self):
		vzctl.start(self.host, self.getVmid())

	def _checkInterfacesExist(self):
		for i in self.interfaceSetAll():
			assert self.host.interface_exists(self.interfaceDevice(i))

	def _createBridges(self):
		for iface in self.interfaceSetAll():
			if iface.isConnected():
				bridge = self.bridgeName(iface)
				assert bridge, "Interface has no bridge %s" % iface
				ifaceutil.bridgeCreate(self.host, bridge)
				ifaceutil.ifup(self.host, bridge)

	def _configureRoutes(self):
		#Note: usage of self as host is intentional
		if self.attributes.get("gateway4"):
			ifaceutil.setDefaultRoute(self, self.attributes["gateway4"]) 
		if self.attributes.get("gateway6"):
			ifaceutil.setDefaultRoute(self, self.attributes["gateway6"]) 

	def getStartTasks(self):
		taskset = Device.getStartTasks(self)
		taskset.addTask(tasks.Task("create-bridges", self._createBridges))
		taskset.addTask(tasks.Task("start-vm", self._startVm, depends="create-bridges"))
		taskset.addTask(tasks.Task("check-interfaces-exist", self._checkInterfacesExist, depends="start-vm"))
		for iface in self.interfaceSetAll():
			taskset.addTaskSet("interface-%s" % iface.name, iface.upcast().getStartTasks().addGlobalDepends("check-interfaces-exist"))
		taskset.addTask(tasks.Task("configure-routes", self._configureRoutes, depends="start-vm"))
		taskset.addTask(tasks.Task("start-vnc", self._startVnc, depends="start-vm"))
		return taskset

	def _stopVnc(self):
		vzctl.stopVnc(self.host, self.getVmid(), self.getVncPort())
		del self.attributes["vnc_port"]
	
	def _stopVm(self):
		vzctl.stop(self.host, self.getVmid())

	def getStopTasks(self):
		taskset = Device.getStopTasks(self)
		taskset.addTask(tasks.Task("stop-vnc", self._stopVnc))
		taskset.addTask(tasks.Task("stop-vm", self._stopVm))
		return taskset	

	def _assignTemplate(self):
		self.setTemplate(templates.findName(self.type, self.getTemplate()))
		assert self.getTemplate() and self.getTemplate() != "None", "Template not found"

	def _assignHost(self):
		if not self.host:
			self.host = self.hostOptions().best()
			assert self.host, "No matching host found"
			self.save()

	def _assignVmid(self):
		assert self.host
		if not self.getVmid():
			self.setVmid(self.host.nextFreeVmId())

	def _configureVm(self):
		if self.getRootPassword():
			vzctl.setUserPassword(self.host, self.getVmid(), self.getRootPassword(), username="root")
		vzctl.setHostname(self.host, self.getVmid(), "%s-%s" % (self.topology.name.replace("_","-"), self.name ))

	def _createInterfaces(self):
		for iface in self.interfaceSetAll():
			vzctl.addInterface(self.host, self.getVmid(), iface.name)

	def _createVm(self):
		vzctl.create(self.host, self.getVmid(), self.getTemplate())

	def getPrepareTasks(self):
		taskset = Device.getPrepareTasks(self)
		taskset.addTask(tasks.Task("assign-template", self._assignTemplate))
		taskset.addTask(tasks.Task("assign-host", self._assignHost))		
		taskset.addTask(tasks.Task("assign-vmid", self._assignVmid, depends="assign-host"))
		taskset.addTask(tasks.Task("create-vm", self._createVm, depends="assign-vmid"))
		taskset.addTask(tasks.Task("configure-vm", self._configureVm, depends="create-vm"))
		taskset.addTask(tasks.Task("create-interfaces", self._createInterfaces, depends="configure-vm"))
		return taskset

	def _unassignHost(self):
		self.host = None
		
	def _unassignVmid(self):
		del self.attributes["vmid"]

	def _destroyVm(self):
		vzctl.destroy(self.host, self.getVmid())

	def getDestroyTasks(self):
		taskset = Device.getDestroyTasks(self)
		if self.host:
			taskset.addTask(tasks.Task("destroy-vm", self._destroyVm))
			taskset.addTask(tasks.Task("unassign-host", self._unassignHost, depends="destroy-vm"))
			taskset.addTask(tasks.Task("unassign-vmid", self._unassignVmid, depends="destroy-vm"))
		return taskset

	def configure(self, properties):
		if "template" in properties:
			assert self.state == State.CREATED, "Cannot change template of prepared device: %s" % self.name
		Device.configure(self, properties)
		if "root_password" in properties:
			if self.state == State.PREPARED or self.state == State.STARTED:
				vzctl.setUserPassword(self.host, self.getVmid(), self.getRootPassword(), username="root")
		if "gateway4" in properties:
			if self.attributes["gateway4"] and self.state == State.STARTED:
				#Note: usage of self as host is intentional
				ifaceutil.setDefaultRoute(self, self.attributes["gateway4"])
		if "gateway6" in properties:
			if self.attributes["gateway6"] and self.state == State.STARTED:
				#Note: usage of self as host is intentional
				ifaceutil.setDefaultRoute(self, self.attributes["gateway6"])
		if "template" in properties:
			self._assignTemplate()
			assert self.getTemplate(), "Template not found: %s" % properties["template"]
		self.save()

	def interfacesAdd(self, name, properties):
		assert self.state != State.STARTED, "OpenVZ does not support adding interfaces to running VMs: %s" % self.name
		import re
		assert re.match("eth(\d+)", name), "Invalid interface name: %s" % name
		try:
			assert not self.interfaceSetGet(name), "Duplicate interface name: %s" % name
		except Interface.DoesNotExist: #pylint: disable-msg=W0702
			pass
		iface = ConfiguredInterface()
		iface.init()
		iface.name = name
		iface.device = self
		if self.state == State.PREPARED or self.state == State.STARTED:
			iface.prepare_run()
		iface.configure(properties)
		iface.save()
		Device.interfaceSetAdd(self, iface)

	def interfacesConfigure(self, name, properties):
		iface = self.interfaceSetGet(name).upcast()
		iface.configure(properties)

	def interfacesRename(self, name, properties):
		iface = self.interfaceSetGet(name).upcast()
		if self.state == State.PREPARED or self.state == State.STARTED:
			vzctl.deleteInterface(self.host, self.getVmid(), iface.name)
		try:
			assert not self.interfaceSetGet(properties["name"]), "Duplicate interface name: %s" % properties["name"]
		except Interface.DoesNotExist: #pylint: disable-msg=W0702
			pass
		iface.name = properties["name"]
		if self.state == State.PREPARED or self.state == State.STARTED:
			iface.prepare_run()
		if self.state == State.STARTED:
			iface.start_run()	
		iface.save()

	def interfacesDelete(self, name):
		iface = self.interfaceSetGet(name).upcast()
		if self.state == State.PREPARED or self.state == State.STARTED:
			vzctl.deleteInterface(self.host, self.getVmid(), iface.name)
		iface.delete()

	def migrateRun(self, host=None):
		#FIXME: both vmids must be reserved the whole time
		if self.state == State.CREATED:
			self._unassignHost()
			self._unassignVmid()
			return
		#save src data
		src_host = self.host
		src_vmid = self.getVmid()
		#assign new host and vmid
		self._unassignHost()
		self._unassignVmid()
		if host:
			self.host = host
		else:
			self._assignHost()
		self._assignVmid()
		dst_host = self.host
		dst_vmid = self.getVmid()
		#reassign host and vmid
		self.host = src_host
		self.setVmid(src_vmid)
		#destroy all connectors and save their state
		constates={}
		for iface in self.interfaceSetAll():
			if iface.isConnected():
				con = iface.connection.connector
				if con.name in constates:
					continue
				constates[con.name] = con.state
				if con.state == State.STARTED:
					con.stop(True)
				if con.state == State.PREPARED:
					con.destroy(True)
		#actually migrate the vm
		if self.state == State.STARTED:
			self._stopVnc()
		vzctl.migrate(src_host, src_vmid, dst_host, dst_vmid)
		if self.state == State.STARTED:
			self._startVnc()
		#switch host and vmid
		self.host = dst_host
		self.setVmid(dst_vmid)
		#redeploy all connectors
		for iface in self.interfaceSetAll():
			if iface.isConnected():
				con = iface.connection.connector
				if not con.name in constates:
					continue
				state = constates[con.name]
				del constates[con.name]
				if state == State.PREPARED or state == State.STARTED:
					con.prepare(True)
				if state == State.STARTED:
					con.start(True)
		
	def uploadSupported(self):
		return self.state == State.PREPARED

	def useUploadedImageRun(self, path):
		assert self.uploadSupported(), "Upload not supported"
		vzctl.useImage(self.host, self.getVmid(), path, forceGzip=True)
		self.setTemplate("***custom***")

	def downloadSupported(self):
		return self.state == State.PREPARED

	def downloadImageUri(self):
		assert self.downloadSupported(), "Download not supported"
		filename = "%s_%s.tar.gz" % (self.topology.name, self.name)
		file = hostserver.randomFilename(self.host)
		vzctl.copyImage(self.host, self.getVmid(), file)
		return hostserver.downloadGrant(self.host, file, filename)

	def getResourceUsage(self):
		disk = 0
		memory = 0
		ports = 1 if self.state == State.STARTED else 0		
		if self.host and self.getVmid():
			disk = vzctl.getDiskUsage(self.host, self.getVmid())
			memory = vzctl.getMemoryUsage(self.host, self.getVmid())
		return {"disk": disk, "memory": memory, "ports": ports}		

	def interfaceDevice(self, iface):
		return vzctl.interfaceDevice(self.getVmid(), iface.name)

	def toDict(self, auth):
		res = Device.toDict(self, auth)
		if not auth:
			del res["attrs"]["vnc_port"]
			del	res["attrs"]["root_password"]
		else:
			res["attrs"]["vnc_password"] = self.vncPassword()
		return res

class ConfiguredInterface(Interface):

	class Meta:
		db_table = "tomato_configuredinterface"
	
	def init(self):
		self.attributes["use_dhcp"] = False
	
	def upcast(self):
		return self

	def interfaceName(self):
		return self.device.upcast().interfaceDevice(self)
		
	def configure(self, properties):
		Interface.configure(self, properties)
		changed=False
		if "use_dhcp" in properties:
			changed = True
		if "ip4address" in properties:
			changed = True
		if "ip6address" in properties:
			changed = True
		if changed:
			if self.device.state == State.STARTED:
				self.start_run()
			self.save()

	def _connectToBridge(self):
		dev = self.device.upcast()
		bridge = dev.bridgeName(self)
		if self.isConnected():
			ifaceutil.bridgeConnect(dev.host, bridge, self.interfaceName())
			ifaceutil.ifup(dev.host, self.interfaceName())
			
	def _configureNetwork(self):
		dev = self.device.upcast()
		#Note usage of dev instead of host is intentional
		if self.attributes["ip4address"]:
			ifaceutil.addAddress(dev, self.name, self.attributes["ip4address"])
			ifaceutil.ifup(dev, self.name) 
		if self.attributes["ip6address"]:
			ifaceutil.addAddress(dev, self.name, self.attributes["ip6address"])
			ifaceutil.ifup(dev, self.name) 
		if self.attributes["use_dhcp"] and util.parse_bool(self.attributes["use_dhcp"]):
			ifaceutil.startDhcp(dev, self.name)
			
	def getStartTasks(self):
		taskset = Interface.getStartTasks(self)
		taskset.addTask(tasks.Task("connect-to-bridge", self._connectToBridge))
		taskset.addTask(tasks.Task("configure-network", self._configureNetwork, depends="connect-to-bridge"))
		return taskset

	def getPrepareTasks(self):
		return Interface.getPrepareTasks(self)

	def toDict(self, auth):
		res = Interface.toDict(self, auth)		
		return res				
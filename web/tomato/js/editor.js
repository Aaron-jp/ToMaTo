// http://marijnhaverbeke.nl/uglifyjs

var ajax = function(options) {
	var t = this;
	$.ajax({
		type: "POST",
	 	async: true,
	 	url: "../ajax/" + options.url,
	 	data: {data: $.toJSON(options.data || {})},
	 	complete: function(res) {
	 		if (res.status != 200) return options.errorFn ? options.errorFn(res.statusText) : null;
	 		var msg = $.parseJSON(res.responseText);
	 		if (! msg.success) return options.errorFn ? options.errorFn(msg.error) : null;
	 		return options.successFn ? options.successFn(msg.result) : null;
	 	}
	});
};

var MenuGroup = Class.extend({
	init: function(name) {
		this.name = name;
		this.container = $('<li></li>');
		this.panel = $('<div></div>');
		this.container.append(this.panel);
		this.label = $('<h3><span>'+name+'</span></h3>');
		this.container.append(this.label);
	},
	addElement: function(element) {
		this.panel.append(element);
	},
	addStackedElements: function(elements) {
		var ul = $('<ul class="ui-ribbon-element ui-ribbon-list"></ul>');
		var count = 0;
		for (var i=0; i < elements.length; i++) {
			if (count >= 3) { //only 3 elements fit
				this.addElement(ul);
				ul = $('<ul class="ui-ribbon-element ui-ribbon-list"></ul>');
				count = 0;
			}			
			var li = $('<li></li>');
			li.append(elements[i]);
			ul.append(li);
			count++;
		}
		this.addElement(ul);
	}
});

var MenuTab = Class.extend({
	init: function(name) {
		this.name = name;
		this.div = $('<div id="menu_tab_'+name+'"></div>');
		this.link = $('<li><a href="'+window.location+'#menu_tab_'+name+'"><span><label>'+name+'</label></span></a></li>');
		this.panel = $('<ul></ul>');
		this.div.append(this.panel);
		this.groups = {};
	},
	addGroup: function(name) {
		var group = new MenuGroup(name);
		this.groups[name] = group;
		this.panel.append(group.container);
		return group;
	},
	getGroup: function(name) {
		return this.groups[name];
	}
});

var Menu = Class.extend({
	init: function(container) {
		this.container = container;
		this.tabs = {};
		this.tabLinks = $('<ul/>');
		this.container.append(this.tabLinks);
	},
	addTab: function(name) {
		var tab = new MenuTab(name);
		this.tabs[name] = tab;
		this.container.append(tab.div);
		this.tabLinks.append(tab.link);
		return tab;
	},
	getTab: function(name) {
		return this.tabs[name];
	},
	paint: function() {
		this.container.ribbon();
	}
});

Menu.button = function(options) {
	var html = $('<button class="ui-ribbon-element ui-ribbon-control ui-button"/>');
	if (options.toggle) {
		html.addClass("ui-button-toggle");
		if (options.toggleGroup) options.toggleGroup.add(html);
	}
	var icon = $('<span class="ui-button-icon ui-icon"></span>');
	if (options.small) {
		html.addClass("ui-ribbon-small-button");
		icon.addClass("icon-16x16");
	} else {
		html.addClass("ui-ribbon-large-button");
		icon.addClass("icon-32x32");
	}
	html.append(icon);
	html.append($('<span class="ui-button-label">'+options.label+'</span>'));
	if (options.func || options.toggle && options.toggleGroup) {
		html.click(function() {
			if (options.toggle && options.toggleGroup) options.toggleGroup.selected(this);
			if (options.func) options.func(this);	
		}); //must be done before call to button()
	}
	icon.css('background-image', 'url("'+options.icon+'")'); //must be done after call to button()
	html.button({tooltip: options.tooltip || options.label || options.name});
	html.attr("id", options.name || options.label);
	html.setChecked = function(value){
		this.toggleClass("ui-button-checked ui-state-highlight", value);
	}
	if (options.checked) html.setChecked(true);
	return html
};

Menu.checkbox = function(options) {
	var html = $('<input type="checkbox" id="'+options.name+'"/><label for="'+options.name+'">'+options.label+'</label>');
	if (options.tooltip) html.attr("title", options.tooltip);
	if (options.func) html.click(function(){
		options.func(html.attr("checked"), html);
	});
	html.setChecked = function(value){
		this.attr("checked", value);
	}
	if (options.checked) html.setChecked(true);
	return html
};

var ToggleGroup = Class.extend({
	init: function() {
		this.buttons = [];
	},
	add: function(button) {
		this.buttons.push(button);
	},
	selected: function(button) {
		for (var i=0; i<this.buttons.length; i++)
			this.buttons[i].setChecked(this.buttons[i].attr("id") == $(button).attr("id"));
	}
});

var FormElement = Class.extend({
	init: function(options) {
		this.options = options;
		this.name = options.name || options.label;
		this.label = options.label || options.name;
		if (options.callback) this.callback = options.callback;
		this.element = null;
	},
	getElement: function() {
		return this.element;
	},
	getLabel: function() {
		return this.label;
	},
	getName: function() {
		return this.name;
	},
	convertInput: function(value) {
		if (this.options.inputConverter) value = this.options.inputConverter(value);
		return value;
	},
	setEnabled: function(value) {
		this.element.attr({disabled: !value});
	},
	onChanged: function(value) {
		if (this.isValid(value)) {
			this.element.removeClass("invalid");
			this.element.addClass("valid");
		} else {
			this.element.removeClass("valid");
			this.element.addClass("invalid");
		}
		if (this.callback) this.callback(this, value);
	},
	isValid: function(value) {
		return true;
	}
});

var TextElement = FormElement.extend({
	init: function(options) {
		this._super(options);
		this.pattern = options.pattern || /^.*$/;
		this.element = $('<input class="form-element" size=10 type="'+(options.password ? "password" : "text")+'" name="'+this.name+'"/>');
		if (options.disabled) this.element.attr({disabled: true});
		var t = this;
		this.element.change(function() {
			t.onChanged(this.value);
		});
		if (options.value != null) this.setValue(options.value);
	},
	getValue: function() {
		return this.convertInput(this.element[0].value);
	},
	setValue: function(value) {
		this.element[0].value = value;
	},
	isValid: function(value) {
		var val = value || this.getValue();
		return this.pattern.test(val);
	}
});

var CheckboxElement = FormElement.extend({
	init: function(options) {
		this._super(options);
		this.element = $('<input class="form-element" type="checkbox" name="'+this.name+'"/>');
		if (options.disabled) this.element.attr({disabled: true});
		var t = this;
		this.element.change(function() {
			t.onChanged(this.checked);
		});
		if (options.value != null) this.setValue(options.value);
	},
	getValue: function() {
		return this.element[0].checked;
	},
	setValue: function(value) {
		this.element[0].checked = value;
	}
});

var ChoiceElement = FormElement.extend({
	init: function(options) {
		this._super(options);
		this.element = $('<select class="form-element" name="'+this.name+'"/>');
		if (options.disabled) this.element.attr({disabled: true});
		var t = this;
		this.element.change(function() {
			t.onChanged(this.value);
		});
		this.choices = options.choices || {};
		this.setChoices(this.choices);
		if (options.value != null) this.setValue(options.value);
	},
	setChoices: function(choices) {
		this.element.find("option").remove();
		for (var name in choices) this.element.append($('<option value="'+name+'">'+choices[name]+'</option>'));
		this.setValue(this.getValue());
	},
	getValue: function() {
		return this.convertInput(this.element[0].value);
	},
	setValue: function(value) {
		var options = this.element.find("option");
		for (var i=0; i < options.length; i++) {
			$(options[i]).attr({selected: options[i].value == value + ""});
		}
	}
});

var TemplateChoiceElement = ChoiceElement.extend({
	init: function(options) {
		this._super(options);
		this.descriptions = options.descriptions;
		console.log(this.descriptions);
		var t = this;
		this.element.change(function(){
			t.updateInfoBox();
		});
		this.info = $('<div class="hoverdescription" style="display: inline;"></div>');
		this.element.after(this.info);
		this.updateInfoBox();
	},
	updateInfoBox: function() {
		
		var escape_str = function(str) {
		    var tagsToReplace = {
		            '&': '&amp;',
		            '<': '&lt;',
		            '>': '&gt;',
		            '\n':'<br />'
		        };
		        return str.replace(/[&<>\n]/g, function(tag) {
		            return tagsToReplace[tag] || tag;
		        });
		    };
		
		this.info.empty();
		var desc = $('<div class="hiddenbox"><p style="margin:4px; border:0px; padding:0px; color:black;">'+escape_str(this.descriptions[this.getValue()])+'</p></div>');
		//desc.append($());
		this.info.append(' &nbsp; <img src="/img/info.png" />');
		this.info.append(desc);
	}
});

var Window = Class.extend({
	init: function(options) {
		log(options);
		this.options = options;
		this.options.position = options.position || ['center',200];
		this.div = $('<div/>').dialog({
			autoOpen: false,
			draggable: options.draggable != null ? options.draggable : true,
			resizable: options.resizable != null ? options.resizable : true,
			height: options.height || "auto",
			width: options.width || "",
			maxHeight:600,
			maxWidth:800,
			title: options.title,
			show: "slide",
			hide: "slide",
			minHeight:50,
			modal: options.modal != null ? options.modal : true,
			buttons: options.buttons || {},
			closeOnEscape: false
		});
		if (options.closeOnEscape != undefined)
			this.div.closeOnEscape = options.closeOnEscape;
		this.setPosition(options.position);
		if (options.content) this.div.append(options.content);
		if (options.autoShow) this.show();
		

		
		this.helpButton = $("<div class=\"windowHelp\"></div>");
		this.helpLink = $("<a><img src=\"/img/help.png\"></a>");
		var t = this;
		this.helpLink.click(function(){
			window.open(t.helpLinkTarget,'_help');
		});
		this.helpButton.append(this.helpLink);
		this.helpLinkTarget="/help";

		this.div.append(this.helpButton);
		
		if(!options.helpTarget) {
			this.helpButton.hide();
		} else {
			this.helpLinkTarget = options.helpTarget;
		}
		
	},
	setTitle: function(title) {
		this.div.dialog("option", "title", title);
	},
	setPosition: function(position) {
		this.div.dialog("option", "position", position);
	},
	show: function() {
		this.setPosition(this.position);
		this.div.dialog("open");
	},
	hide: function() {
		this.div.dialog("close");
	},
	toggle: function() {
		if (this.div.dialog("isOpen")) this.hide();
		else this.show();
	},
	add: function(div) {
		this.div.append(div);
	},
	getDiv: function() {
		return this.div;
	}
});

var TutorialWindow = Window.extend({
	init: function(options) {
			this._super(options);
			if (options.hideCloseButton)
				$(this.div.parent()[0].getElementsByClassName("ui-dialog-titlebar-close")).hide();
			
			if (!options.tutorialVisible)
				return;
				
			this.editor = options.editor
				
			this.tutorialStatus = options.tutorial_status || 0;
			
			//create UI
			var t = this
			this.text = $("<div>.</div>");
			this.buttons = $("<p style=\"text-align:right; margin-bottom:0px; padding-bottom:0px;\"></p>");
			this.backButton = $("<input type=\"button\" value=\"Back\" />");
			this.buttons.append(this.backButton);
			this.backButton.click(function() {t.tutorialGoBack(); });
			this.skipButton = $("<input type=\"button\" value=\"Skip\" />");
			this.buttons.append(this.skipButton);
			this.skipButton.click(function() {t.tutorialGoForth(); });
			this.closeButton = $("<input type=\"button\" value=\"Close Tutorial\" />");
			this.buttons.append(this.closeButton);
			
			this.closeButton.click(function() {
				t.setTutorialVisible(false);
			});
			
			this.add(this.text);
			this.add(this.buttons);
			
			this.tutorialVisible = true;
			if (options.tutorialVisible != undefined) {
				this.setTutorialVisible(options.tutorialVisible);
			}
			
			//load the basic tutorial at the creating of the editor.
			this.tutorialSteps = [];
			this.loadTutorial();
			
	},
	setTutorialVisible: function(vis) {  //vis==true: show tutorial. vis==false: hide tutorial.
		if (vis) {
			this.show();
		} else {
			this.hide();
			this.closeTutorial();
		}
		this.tutorialVisible = vis;
	},
	tutorialGoBack: function() {
		if (this.tutorialStatus > 0) {
			this.tutorialStatus--;
			this.skipButton.show();
			this.closeButton.hide();
		}
		if (this.tutorialStatus == 0) {
			this.backButton.hide();
		}
		this.updateText();
		this.updateStatusToBackend();
	},
	tutorialGoForth: function() {
		if (this.tutorialStatus + 1 < this.tutorialSteps.length) {
			this.tutorialStatus++;	
			this.backButton.show();
		}
		if (this.tutorialStatus + 1 == this.tutorialSteps.length) {
			this.skipButton.hide();
			this.closeButton.show();
		}
		this.updateText();
		this.updateStatusToBackend();
	},
	triggerProgress: function(triggerObj) { //continues tutorial if correct trigger
		if (this.tutorialVisible) { //don't waste cpu time if not needed... trigger function may be complex.
			if (this.tutorialSteps[this.tutorialStatus].trigger != undefined) {
				if (this.tutorialSteps[this.tutorialStatus].trigger(triggerObj)) {
					this.tutorialGoForth();
				}
			}
		}
	},
	loadTutorial: function() {//loads editor_tutorial.tutName; tutID: position in "tutorials" array
		//load tutorial
		this.tutorialSteps = editor_tutorial
		
		//set visible buttons
		if (this.tutorialStatus == 0) {
			this.backButton.hide();
			this.skipButton.show();
			this.closeButton.hide();
		} else {
			this.backButton.show();
			if (this.tutorialStatus == this.tutorialSteps.length - 1) {
				this.skipButton.hide();
				this.closeButton.show();
			} else {
				this.skipButton.show();
				this.closeButton.hide();
			}
		}
		
		//show text
		this.updateText();
	},
	updateText: function() {
		if (!this.tutorialVisible) return;
		var text = this.tutorialSteps[this.tutorialStatus].text;
		this.text.empty();
		this.text.append(text);

		this.setTitle("Tutorial [" + (this.tutorialStatus+1) + "/" + this.tutorialSteps.length + "]");
		
		//dirty hack: un-set the window's height property
		this.div[0].style.height = "";
		
		var helpUrl=this.tutorialSteps[this.tutorialStatus].help_page;
		if (helpUrl) {
			this.helpLinkTarget="/help/"+helpUrl;
			this.helpButton.show();
		} else {
			this.helpButton.hide();
		}
		
		var skipButtonText = this.tutorialSteps[this.tutorialStatus].skip_button;
		if (skipButtonText) {
			this.skipButton[0].value = skipButtonText;
		} else {
			this.skipButton[0].value = "Skip";
		}
	},
	updateStatusToBackend: function() {
		ajax({
			url: 'topology/'+this.editor.topology.id+'/modify',
		 	data: {attrs: {
		 					_tutorial_status: this.tutorialStatus
		 					},
		 			}
		});
	},
	closeTutorial: function() {
		var t = this
		if (confirm("You have completed the tutorial. Do you wish to keep this topology? (\"Cancel\" will delete it)")) {
			ajax({
				url: 'topology/'+this.editor.topology.id+'/modify',
			 	data: {attrs: {
			 					_tutorial_disabled: true
			 					},
			 			}
			});
		} else {
			ajax({
				url: "topology/"+this.editor.topology.id+"/remove",
				successFn: function() {
					t.editor.triggerEvent({component: "topology", object: t.editor.topology, operation: "remove", phase: "end"});
					window.location = "/topology";
				}
			});	
		}
	}
	
	
});

var AttributeWindow = Window.extend({
	init: function(options) {
		this._super(options);
		this.table = $('<table/>');
		this.div.append(this.table);
		this.elements = [];
	},
	add: function(element) {
		this.elements.push(element);
		var tr = $("<tr/>");
		tr.append($("<td/>").append(element.getLabel()));
		tr.append($("<td/>").append(element.getElement()));
		this.table.append(tr);
	},
	autoElement: function(info, value, enabled) {
		var el;
		if (info.options) {
			el = new ChoiceElement({
				label: info.desc || info.name,
				name: info.name,
				choices: info.options,
				value: value || info["default"],
				disabled: !enabled
			});
		} else if (info.type == "bool") {
			el = new CheckboxElement({
				label: info.desc || info.name,
				name: info.name,
				value: value || info["default"],
				disabled: !enabled
			});
		} else {
			var converter = null;
			switch (info.type) {
				case "int":
					converter = parseInt;
					break;
				case "float":
					converter = parseFloat;
					break;
			}
			el = new TextElement({
				label: info.desc || info.name,
				name: info.name,
				value: value || info["default"],
				disabled: !enabled,
				inputConverter: converter 
			});
		}
		return el;
	},
	autoAdd: function(info, value, enabled) {
		this.add(this.autoElement(info, value, enabled));
	},
	getValues: function() {
		var values = {};
		for (var i=0; i < this.elements.length; i++) values[this.elements[i].name] = this.elements[i].getValue();
		return values;
	}
});

var PermissionsWindow = Window.extend({
	init: function(options) {
		options.modal = true;
		this._super(options);
		
		var t = this;

		this.options = options;
		this.options.allowChange = this.options.isGlobalOwner
		this.topology = options.topology;
		this.permissions = this.options.permissions;
		
		this.editingList = {};
		
		this.userList = $('<div />');
		this.userListFinder = {};
		this.div.append(this.userList);
		this.listCreated = false;
		
		this.buttons = $('<div />');
		
		this.closeButton = $('<input type="button" value="Close" style="float:right;" />');
		this.closeButton.click(function(){
			/* if (t.div.getElementsByTagName("select").length > 0) {
				if (!window.confirm("Are you sure you want to discard all changes?"))
					return
				else
					this.div.empty();
					this.listCreated = false;
			} */
			t.hide();
		});
		this.buttons.append(this.closeButton);
		
		this.div.append(this.buttons);
		
		
		
	},
	
	disableClose: function() {
		this.closeButton.attr("disabled",true);
		$(this.div.parent()[0].getElementsByClassName("ui-dialog-titlebar-close")).hide();
	},
	enableClose: function() {
		this.closeButton.attr("disabled",false);
		$(this.div.parent()[0].getElementsByClassName("ui-dialog-titlebar-close")).show();
	},
	checkEnableDisableClose: function() {
		var disable = false;
		for (i in this.editingList) {
			disable = disable || this.editingList[i];
		}
		if (disable) {
			this.disableClose();
		} else {
			this.enableClose();
		}
	},
	
	createUserPermList: function() {
		var t = this;
		
		if (this.listCreated) return;
		this.listCreated = true;
		
		if (!this.options.allowChange) {
			this.options.allowChange = (this.topology.data.permissions[this.options.ownUserId] == "owner");
		}
		
		if (this.options.allowChange) {
			var addbutton = $('<input type="button" value="Add User" />');
			addbutton.click(function(){
				t.addNewUser();
			});
			this.buttons.append(addbutton);
		}
		
		this.userTable = $('<table><tr><th/><th>User</th><th>Permission</th></tr></table>');
		if (this.options.allowChange) this.userTable.append($('<th />'));
		this.userList.append(this.userTable);
		var perm = this.topology.data.permissions;
		for (u in perm) {
			if (perm[u] != null)
				this.addUserToList(u);
		}
	},
	
	addUserToList: function(username) {
		var t = this;
		var tr = $('<tr />');
		var td_name = $('<td/>');
		var td_perm = $('<td/>');
		var td_buttons = $('<td/>');
		var td_icon = $('<td/>')
		
		ajax({
			url:	'account/'+username+'/info',
			successFn: function(data) {
				var s = data.realname+' (<a href="/account/info/'+data.id+'" target="_blank">'+data.id+'</a>)'
				td_name.append($(s));
				if (data.id == t.options.ownUserId) td_icon.append($('<img src="/img/user.png" title="This is you!" />'));
			}
		});

		tr.append(td_icon);
		tr.append(td_name);
		tr.append(td_perm);
		if (this.options.allowChange) tr.append(td_buttons);
		this.userListFinder[username] = {
				td_icon: td_icon,
				td_name: td_name,
				td_perm: td_perm,
				td_buttons: td_buttons,
				tr: tr
		};
		this.userTable.append(tr);
		
		this.drawView(username);
	},
	
	addNewUser: function() {
		var username = window.prompt("Please enter the user's username")
		var t = this;
		if (username) ajax({
			url:	'account/'+username+'/info',
			successFn: function(data) {
				if (!(data.id in t.userListFinder)) {
					if (window.confirm("Found the user "+ data.realname + ' (' + data.id +")\nIs this correct?")) {
						t.addUserToList(data.id);
						t.makePermissionEditable(data.id);
					}
				} else
					window.alert("This user is already in the list.");
			},
			errorFn: function(msg) {
				window.alert("Error: "+msg);
			}
		});
		
	},
	
	removeUserFromList: function(username) {
		this.userListFinder[username].tr.remove();
		this.editingList[username] = false;
		this.checkEnableDisableClose();
		delete this.userListFinder[username];
	},
	
	makePermissionEditable: function(username) {
		if (!this.options.allowChange || this.username == this.options.ownUserId) return;
		
		var t = this;
		td_perm = this.userListFinder[username].td_perm;
		td_buttons = this.userListFinder[username].td_buttons;
		permission = this.topology.data.permissions[username];
		td_perm.empty();
		td_buttons.empty();
		var sel_id='permissions_'+username;
		
		var sel=$('<select name="sel" id="'+sel_id+'"></select>');
		for (perm in this.permissions) {
			if (perm != "null")
				sel.append($('<option value="'+perm+'" title="'+this.permissions[perm].description+'">'+this.permissions[perm].title+'</option>'));
		}
		sel.change(function(){ sel[0].title = t.permissions[sel[0].value].description });
		
		if ((permission == undefined) || (permission == null))
			permission = 'null';
		sel.val(permission);
		sel.change();
		td_perm.append(sel);
		
		var saveButton = $('<img src="/img/tick.png" title="save" style="cursor:pointer;" />');
		saveButton.click(function() {
			var sel = document.getElementById(sel_id);
			var perm = sel.options[sel.selectedIndex].value;
			t.setPermission(username, perm);
		});
		td_buttons.append(saveButton);
		
		var cancelButton = $('<img src="/img/eraser16.png" title="cancel" style="cursor:pointer;" />');
		cancelButton.click(function(){
			t.backToView(username);
		});
		td_buttons.append(cancelButton);
		
		this.editingList[username] = true;
		this.checkEnableDisableClose();
	},
	
	setPermission: function(username, permission) {
		if (!this.options.allowChange || this.username == this.options.ownUserId) return;
		
		var t = this;
		
		var perm_send = null;
		if (permission != 'null')
			perm_send = permission;
		
		ajax({
			url: 'topology/'+this.topology.id+'/permission',
			data: {user: username, permission: perm_send},
			successFn: function(){ 
				if (permission != null) {
					t.topology.data.permissions[username]=permission;
				} else {
					delete t.topology.data.permissions[username];
				}
				if (perm_send == null) {
					t.removeUserFromList(username)
				} else {
					t.backToView(username);
				}
			},
			errorFn: function(msg){
				window.alert("Error while setting permission: "+msg);
				t.backToView(username);
			}
		})
	},
	
	backToView: function(username) {
		if (username in this.topology.data.permissions && this.topology.data.permissions != null) {
			this.drawView(username);
		} else {
			this.removeUserFromList(username);
		}
	},
	drawView: function(username) {
		var t = this;
		
		var permission = '<div class="hoverdescription">'+this.permissions['null'].title+'</div>';
		if (username in this.topology.data.permissions) {
			permission_var = this.topology.data.permissions[username];
			permission = $('<span title="'+this.permissions[permission_var].description+'">'+this.permissions[permission_var].title+'</span>');
			//permission = $('<div class="hoverdescription">'+this.permissions[permission_var].title+'<div class="hiddenbox"><p>'+ this.permissions[permission_var].description +'</p></div></div>')
		}
		
		var td_perm = this.userListFinder[username].td_perm;
		var td_buttons = this.userListFinder[username].td_buttons;
		td_perm.empty();
		td_buttons.empty();
		
		td_perm.append(permission);
		
		if (username != this.options.ownUserId) {
			var editButton = $('<img src="/img/pencil.png" title="edit permissions" style="cursor:pointer;" />');
			editButton.click(function(){
				t.makePermissionEditable(username);
			});
			td_buttons.append(editButton);
			
			var removeButton = $('<img src="/img/cross.png" title="remove from list" style="cursor:pointer;" />');
			removeButton.click(function(){
				t.setPermission(username,null);
			})
			td_buttons.append(removeButton);
			this.editingList[username] = false;
			this.checkEnableDisableClose();
		}
		
	}
	
	
});

var Workspace = Class.extend({
	init: function(container, editor) {
		this.container = container;
		this.editor = editor;
		container.addClass("ui-widget-content").addClass("ui-corner-all")
		container.addClass("tomato").addClass("workspace");
		container[0].obj = editor.topology;
		this.container.click(function(){});
    	this.size = {x: this.container.width(), y: this.container.height()};
    	this.canvas = Raphael(this.container[0], this.size.x, this.size.y);
    	var c = this.canvas;
		var fs = this.editor.options.frame_size;
    	this.canvas.absPos = function(pos) {
    		return {x: fs + pos.x * (c.width-2*fs), y: fs + pos.y * (c.height-2*fs)};
    	}
    	this.canvas.relPos = function(pos) {
    		return {x: (pos.x - fs) / (c.width-2*fs), y: (pos.y - fs) / (c.height-2*fs)};
    	}
    	
    	//tutorial UI
    	this.tutorialWindow = new TutorialWindow({ 
			autoOpen: false, 
			draggable: true,  
			resizable: false, 
			title: ".", 
			modal: false, 
			buttons: {},
			width:500,
			closeOnEscape: false,
			tutorialVisible:this.editor.options.tutorial,
			tutorial_status:this.editor.options.tutorial_status,
			hideCloseButton: true,
			editor: this.editor
		});
    	
    	this.permissionsWindow = new PermissionsWindow({
    		autoOpen: false,
    		draggable: true,
    		resizable: false,
    		title: "Permissions",
    		modal: false,
    		width: 500,
    		topology: this.editor.topology,
    		isGlobalOwner: this.editor.options.isGlobalOwner, //todo: set value depending on user permissions
    		ownUserId: this.editor.options.userId,
    		permissions: this.editor.options.permission_list
    	});
    	
    	var t = this;
    	this.editor.listeners.push(function(obj){
    		t.tutorialWindow.triggerProgress(obj);
    	});
    	
    	
		this.connectPath = this.canvas.path("M0 0L0 0").attr({"stroke-dasharray": "- "});
		this.container.click(function(evt){
			t.onClicked(evt);
		});
		this.container.mousemove(function(evt){
			t.onMouseMove(evt);
		});
		this.busyIcon = this.canvas.image("img/loading_big.gif", this.size.x/2, this.size.y/2, 32, 32);
		this.busyIcon.attr({opacity: 0.0});
	},
	
	setBusy: function(busy) {
		this.busyIcon.attr({opacity: busy ? 1.0 : 0.0});
	},
	
	
	onMouseMove: function(evt) {
		if (! this.editor.connectElement) {
			this.connectPath.hide();
			return;
		}
		this.connectPath.show();
		var pos = this.editor.connectElement.getAbsPos();
		var mousePos = {x: evt.pageX - this.container.offset().left, y: evt.pageY - this.container.offset().top};
		this.connectPath.attr({path: "M"+pos.x+" "+pos.y+"L"+mousePos.x+" "+mousePos.y});
	},
	onClicked: function(evt) {
		switch (this.editor.mode) {
			case Mode.position:
				var pos;
				if (evt.offsetX) pos = this.canvas.relPos({x: evt.offsetX, y: evt.offsetY});
				else {
					var objPos = this.container.offset();
					pos = this.canvas.relPos({x: evt.pageX - objPos.left, y: evt.pageY - objPos.top});
				}
				this.editor.positionElement(pos);
				break;
			default:
				break;
		}
	},
	onOptionChanged: function(name) {
    		this.tutorialWindow.updateText();
	},
	onModeChanged: function(mode) {
		for (var name in Mode) this.container.removeClass("mode_" + Mode[name]);
		this.container.addClass("mode_" + mode);
	}
});

var Topology = Class.extend({
	init: function(editor) {
		this.editor = editor;
		this.elements = {};
		this.connections = {};
	},
	_getCanvas: function() {
		return this.editor.workspace.canvas;
	},
	loadElement: function(el) {
		var elObj;
		switch (el.type) {
			case "kvm":
			case "kvmqm":
			case "openvz":
			case "repy":
				elObj = new VMElement(this, el, this._getCanvas());
				break;
			case "kvm_interface":
			case "kvmqm_interface":
			case "repy_interface":
				elObj = new VMInterfaceElement(this, el, this._getCanvas());
				break;
			case "openvz_interface":
				elObj = new VMConfigurableInterfaceElement(this, el, this._getCanvas());
				break;
			case "external_network":
				elObj = new ExternalNetworkElement(this, el, this._getCanvas());
				break;
			case "external_network_endpoint":
				//hide external network endpoints with external_network parent but show endpoints without parent 
				elObj = el.parent ? new SwitchPortElement(this, el, this._getCanvas()) : new ExternalNetworkElement(this, el, this._getCanvas()) ;
				break;
			case "tinc_vpn":
				elObj = new VPNElement(this, el, this._getCanvas());
				break;
			case "tinc_endpoint":
				//hide tinc endpoints with tinc_vpn parent but show endpoints without parent 
				elObj = el.parent ? new SwitchPortElement(this, el, this._getCanvas()) : new VPNElement(this, el, this._getCanvas()) ;
				break;
			default:
				elObj = new UnknownElement(this, el, this._getCanvas());
				break;
		}
		if (el.id) this.elements[el.id] = elObj;
		if (el.parent) {
			//parent id is less and thus objects exists
			elObj.parent = this.elements[el.parent];
			this.elements[el.parent].children.push(elObj);
		}
		elObj.paint();
		return elObj;
	},
	loadConnection: function(con, elements) {
		var conObj = new Connection(this, con, this._getCanvas());
		if (con.id) this.connections[con.id] = conObj;
		if (con.elements) { //elements are given by id
			for (var j=0; j<con.elements.length; j++) {
				this.elements[con.elements[j]].connection = conObj;
				conObj.elements.push(this.elements[con.elements[j]]);
			}
		} else { //elements are given by object reference 
			for (var j=0; j<elements.length; j++) {
				elements[j].connection = conObj;
				conObj.elements.push(elements[j]);
			}
		}
		conObj.paint();
		return conObj;
	},
	load: function(data) {
		this.data = data;
		this.id = data.id;
		this.elements = {};
		//sort elements by id so parents get loaded before children
		data.elements.sort(function(a, b){return a.id - b.id;});
		for (var i=0; i<data.elements.length; i++) this.loadElement(data.elements[i]);
		this.connections = {};
		for (var i=0; i<data.connections.length; i++) this.loadConnection(data.connections[i]);
		
		this.settingOptions = true;
		var opts = ["safe_mode", "snap_to_grid", "fixed_pos", "colorify_segments", "debug_mode"];
		for (var i = 0; i < opts.length; i++) {
			if (this.data.attrs["_"+opts[i]] != null) this.editor.setOption(opts[i], this.data.attrs["_"+opts[i]]);
		}
		this.settingOptions = false;		

		this.onUpdate();
	},
	setBusy: function(busy) {
		this.busy = busy;
	},
	modify: function(attrs) {
		this.setBusy(true);
		this.editor.triggerEvent({component: "topology", object: this, operation: "modify", phase: "begin", attrs: attrs});
		var t = this;
		//TODO: success and error callbacks
		ajax({
			url: 'topology/'+this.id+'/modify',
		 	data: {attrs: attrs},
		});
	},
	modify_value: function(name, value) {
		var attrs = {};
		attrs[name] = value;
		this.modify(attrs);
		this.data.attrs[name] = value;
	},
	isEmpty: function() {
		for (var id in this.elements) if (this.elements[id] != this.elements[id].constructor.prototype[id]) return false;
		return true;
		//no connections without elements
	},
	elementCount: function() {
		var count = 0;
		for (var id in this.elements) count++;
		return count;
	},
	connectionCount: function() {
		var count = 0;
		for (var id in this.connections) count++;
		return count;
	},
	nextElementName: function(data) {
		var names = [];
		for (var id in this.elements) names.push(this.elements[id].data.attrs.name);
		var base;
		switch (data.type) {
			case "external_network":
				base = data.attrs.kind || "internet";
				break;
			case "external_network_endpoint":
				base = (data.attrs.kind || "internet") + "_endpoint";
				break;		
			case "tinc_vpn":
				base = data.attrs.mode || "switch";
				break;
			case "tinc_endpoint":
				base = "tinc";
				break;		
			default:
				base = data.type;
		}
		var num = 1;
		while (names.indexOf(base+num) != -1) num++;
		return base+num;
	},
	createElement: function(data, callback) {
		data.attrs = data.attrs || {};
		if (!data.parent) data.attrs.name = data.attrs.name || this.nextElementName(data);
		var obj = this.loadElement(data);
		this.editor.triggerEvent({component: "element", object: obj, operation: "create", phase: "begin", attrs: data});
		obj.setBusy(true);
		var t = this;
		ajax({
			url: "topology/" + this.id + "/create_element",
			data: data,
			successFn: function(data) {
				t.elements[data.id] = obj;
				obj.setBusy(false);
				obj.updateData(data);
				if (callback) callback(obj);
				t.editor.triggerEvent({component: "element", object: obj, operation: "create", phase: "end", attrs: data});
				t.onUpdate();
			},
			errorFn: function(error) {
				alert(error);
				obj.paintRemove();
				t.editor.triggerEvent({component: "element", object: obj, operation: "create", phase: "error", attrs: data});
			}
		});
		return obj;
	},
	createConnection: function(el1, el2, data) {
		if (el1 == el2) return;
		if (! el1.isConnectable()) return;
		if (! el2.isConnectable()) return;
		var ids = 0;
		var t = this;
		var obj;
		var callback = function(ready) {
			ids++;
			if (ids < 2) return;
			t.editor.triggerEvent({component: "connection", object: obj, operation: "create", phase: "begin", attrs: data});
			data.elements = [el1.id, el2.id];
			ajax({
				url: "connection/create",
				data: data,
				successFn: function(data) {
					t.connections[data.id] = obj;
					obj.updateData(data);
					t.editor.triggerEvent({component: "connection", object: obj, operation: "create", phase: "end", attrs: data});
					t.onUpdate();
					el1.onConnected();
					el2.onConnected();
				},
				errorFn: function(error) {
					alert(error);
					obj.paintRemove();
					t.editor.triggerEvent({component: "connection", object: obj, operation: "create", phase: "error", attrs: data});
				}
			});
		};
		el1 = el1.getConnectTarget(callback);
		el2 = el2.getConnectTarget(callback);
		data = data || {};
		data.attrs = data.attrs || {};
		obj = this.loadConnection(copy(data, true), [el1, el2]);
		return obj;
	},
	onOptionChanged: function(name) {
		if (this.settingOptions) return;
		this.modify_value("_" + name, this.editor.options[name]);
		this.onUpdate();
	},
	action: function(action, options) {
		var options = options || {};
		if ((action=="destroy"||action=="stop") && !options.noask && this.editor.options.safe_mode && ! confirm("Do you want to " + action + " this topology?")) return;
		this.editor.triggerEvent({component: "topology", object: this, operation: "action", phase: "begin", action: action});
		var ids = 0;
		var t = this;
		var cb = function() {
			ids--;
			if (ids <= 0 && options.callback) options.callback();
			t.editor.triggerEvent({component: "topology", object: this, operation: "action", phase: "end", action: action});
		}
		for (var id in this.elements) {
			var el = this.elements[id];
			if (el.busy) continue;
			if (el.parent) continue;
			if (el.actionEnabled(action)) {
				el.action(action, {
					noask: true,
					callback: cb
				});
				ids++;
			}
		}
		if (ids <= 0 && options.callback) options.callback();
		this.onUpdate();
	},
	action_start: function() {
		var t = this;
		this.action("prepare", {
			callback: function(){
				t.action("start", {});
			}
		});
	},
	action_stop: function() {
		this.action("stop");
	},
	action_prepare: function() {
		this.action("prepare");
	},
	action_destroy: function() {
		var t = this;
		this.action("stop", {
			callback: function(){
				t.action("destroy", {});
			}
		});
	},
	remove: function() {
		if (! confirm("Are you sure you want to completely remove this topology?")) return;
		var t = this;
		var removeTopology = function() {
			t.editor.triggerEvent({component: "topology", object: t, operation: "remove", phase: "begin"});
			ajax({
				url: "topology/"+t.id+"/remove",
				successFn: function() {
					t.editor.triggerEvent({component: "topology", object: t, operation: "remove", phase: "end"});
					window.location = "/topology";
				}
			});			
		}
		if (this.elementCount()) {
			for (var elId in this.elements) {
				if (this.elements[elId].parent) continue;
				this.elements[elId].remove(function(){
					if (! t.elementCount()) removeTopology();		
				}, false);
			}
		} else removeTopology();
	},
	showDebugInfo: function() {
		var t = this;
		ajax({
			url: 'topology/'+this.id+'/info',
		 	data: {},
		 	successFn: function(result) {
		 		var win = new Window({
		 			title: "Debug info",
		 			position: "center top",
		 			width: 800,
		 			buttons: {
		 				Close: function() {
		 					win.hide();
		 				}
					} 
		 		});
		 		win.add($("<pre></pre>").text(JSON.stringify(result, undefined, 2)));
		 		win.show();
		 	},
		 	errorFn: function(error) {
		 		alert(error);
		 	}
		});
	},
	showUsage: function() {
  		window.open('/topology/'+this.id+'/usage', '_blank', 'innerHeight=450,innerWidth=650,status=no,toolbar=no,menubar=no,location=no,hotkeys=no,scrollbars=no');
		this.editor.triggerEvent({component: "topology", object: this, operation: "usage-dialog"});
	},
	notesDialog: function() {
		var dialog = $("<div/>");
		var ta = $('<textarea cols=60 rows=20 class="notes"></textarea>');
		ta.text(this.data.attrs._notes || "");
		dialog.append(ta);
		var openWithEditor_html = $('<input type="checkbox" name="openWithEditor">Open Window with Editor</input>');
		var openWithEditor = openWithEditor_html[0];
		if (this.data.attrs._notes_autodisplay) {
			openWithEditor.checked = true;
			console.log("check");
		}
		dialog.append($('<br/>'))
		dialog.append(openWithEditor_html);
		var t = this;
		dialog.dialog({
			autoOpen: true,
			draggable: false,
			resizable: true,
			height: "auto",
			width: 550,
			title: "Notes for Topology",
			show: "slide",
			hide: "slide",
			modal: true,
			buttons: {
				Save: function() {
		        	dialog.dialog("close");
			      	t.modify_value("_notes", ta.val());
			      	t.modify_value("_notes_autodisplay", openWithEditor.checked)
			    },
		        Close: function() {
		        	dialog.dialog("close");
		        }				
			}
		});
	},
	renameDialog: function() {
		var name = prompt("Topology name:", this.data.attrs.name);
		if (name) {
			this.modify_value("name", name);
			$('#topology_name').text("Topology '"+this.data.attrs.name+"' [#"+this.id+"]");
		}
	},
	initialRenameDialog: function() {
		var name = prompt("You have created a new Topology. Please enter a name for it:", this.data.attrs.name);
		if (name) {
			this.modify_value("name", name);
			$('#topology_name').text("Topology '"+this.data.attrs.name+"' [#"+this.id+"]");
		}
	},
	name: function() {
		return this.data.attrs.name;
	},
	onUpdate: function() {
		this.checkNetworkLoops();
		var segments = this.getNetworkSegments();
		this.colorNetworkSegments(segments);
		this.editor.triggerEvent({component: "topology", object: this, operation: "update"});
	},
	getNetworkSegments: function() {
		var segments = [];
		for (var con in this.connections) {
			var found = false;
			for (var i=0; i<segments.length; i++)
			 if (segments[i].connections.indexOf(this.connections[con].id) >= 0)
			  found = true;
			if (found) continue;
			segments.push(this.connections[con].calculateSegment());
		}
		return segments;
	},
	checkNetworkLoops: function() {
		var maxCount = 1;
		this.loop_last_warn = this.loop_last_warn || 1;
		for (var i in  this.elements) {
			var el = this.elements[i];
			if (el.data.type != "external_network_endpoint") continue;
			if (! el.connection) continue; //can that happen?
			var segment = el.connection.calculateSegment([el.id], []);
			var count = 0;
			for (var j=0; j<segment.elements.length; j++) {
				var e = this.elements[segment.elements[j]];
				if (! e) continue; //brand new element
				if (e.data.type == "external_network_endpoint") count++;
			}
			maxCount = Math.max(maxCount, count);
		}
		if (maxCount > this.loop_last_warn) alert("Network segments must not contain multiple external network exits! This could lead to loops in the network and result in a total network crash.");
		this.loop_last_warn = maxCount;
	},
	colorNetworkSegments: function(segments) {
		var skips = 0;
		for (var i=0; i<segments.length; i++) {
			var cons = segments[i].connections;
			var num = (this.editor.options.colorify_segments && cons.length > 1) ? (i-skips) : NaN;
			if (cons.length == 1) skips++;
			for (var j=0; j<cons.length; j++) {
				var con = this.connections[cons[j]];
				if (! con) continue; //brand new connection
				con.setSegment(num);
			}
		}
	}
});

var createTopologyMenu = function(obj) {
	var menu = {
		callback: function(key, options) {},
		items: {
			"header": {
				html:'<span>Topology "'+obj.name()+'"</span>',
				type:"html"
			},
			"actions": {
				name:'Global actions',
				icon:'control',
				items: {
					"start": {
						name:'Start',
						icon:'start',
						callback: function(){
							obj.action_start();
						}
					},
					"stop": {
						name:"Stop",
						icon:"stop",
						callback: function(){
							obj.action_stop();
						}
					},
					"prepare": {
						name:"Prepare",
						icon:"prepare",
						callback: function(){
							obj.action_prepare();
						}
					},
					"destroy": {
						name:"Destroy",
						icon:"destroy",
						callback:function(){
							obj.action_destroy();
						}
					}
				}
			},
			"sep1": "---",
			"notes": {
				name:"Notes",
				icon:"notes",
				callback: function(){
					obj.notesDialog();
				}
			},
			"usage": {
				name:"Resource usage",
				icon:"usage",
				callback: function(){
					obj.showUsage();
				}
			},
			"debug": obj.editor.options.debug_mode ? {
				name:'Debug',
				icon:'debug',
				callback: function(){
					obj.showDebugInfo();
				}
			} : null,
			"sep2": "---",
			"remove": {
				name:'Delete',
				icon:'remove',
				callback: function(){
					obj.remove();
				}
			}
		}
	};	
	for (var name in menu.items) {
		if (! menu.items[name]) delete menu.items[name]; 
	}
	return menu;
};

['right', 'longclick'].forEach(function(trigger) {
	$.contextMenu({
		selector: '.tomato.workspace',
		trigger: trigger,
		build: function(trigger, e) {
			return createTopologyMenu(trigger[0].obj);
		}
	});	
});

var Component = Class.extend({
	init: function(topology, data, canvas) {
		this.topology = topology;
		this.editor = topology.editor;
		this.setData(data);
		this.canvas = canvas;
	},	
	paint: function() {
	},
	paintUpdate: function() {
	},
	paintRemove: function() {
	},
	setBusy: function(busy) {
		this.busy = busy;
	},
	actionEnabled: function(action) {
		return (action in this.caps.actions) && (this.caps.actions[action].indexOf(this.data.state) >= 0); 
	},
	attrEnabled: function(attr) {
		return (attr[0] == "_") || (attr in this.caps.attrs) && (! this.caps.attrs[attr].states || this.caps.attrs[attr].states.indexOf(this.data.state) >= 0);
	},
	setData: function(data) {
		this.data = data;
		this.id = data.id;
		this.caps = this.editor.capabilities[this.component_type][this.data.type];
	},
	updateData: function(data) {
		if (data) this.setData(data);
		this.topology.onUpdate();
		this.paintUpdate();
	},
	triggerEvent: function(event) {
		event.component = this.component_type;
		event.object = this;
		this.editor.triggerEvent(event);
	},
	showDebugInfo: function() {
		var t = this;
		ajax({
			url: this.component_type+'/'+this.id+'/info',
		 	data: {},
		 	successFn: function(result) {
		 		var win = new Window({
		 			title: "Debug info",
		 			position: "center top",
		 			width: 800,
		 			buttons: {
		 				Close: function() {
		 					win.hide();
		 				}
					} 
		 		});
		 		win.add($("<pre></pre>").text(JSON.stringify(result, undefined, 2)));
		 		win.show();
		 	},
		 	errorFn: function(error) {
		 		alert(error);
		 	}
		});
	},
	showUsage: function() {
  		window.open('../'+this.component_type+'/'+this.id+'/usage', '_blank', 'innerHeight=450,innerWidth=650,status=no,toolbar=no,menubar=no,location=no,hotkeys=no,scrollbars=no');
		this.triggerEvent({operation: "usage-dialog"});
	},
	configWindowSettings: function() {
		return {
			order: ["name"],
			ignore: [],
			unknown: true,
			special: {}
		} 
	},
	showConfigWindow: function() {
		var absPos = this.getAbsPos();
		var wsPos = this.editor.workspace.container.position();
		var t = this;
		var settings = this.configWindowSettings();
		
		var helpTarget = undefined;
		if ($.inArray(this.data.type,this.editor.supported_configwindow_help_pages)) {
			helpTarget = "/help/editor/configwindow_"+this.data.type;
		}
		
		console.log('opening config window for type '+this.data.type);
		
		this.configWindow = new AttributeWindow({
			title: "Attributes",
			width: "600",
			helpTarget:helpTarget,
			buttons: {
				Save: function() {
					t.configWindow.hide();
					var values = t.configWindow.getValues();
					for (var name in values) {
						if (values[name] === t.data.attrs[name]) delete values[name];
						// Tread "" like null
						if (values[name] === "" && t.data.attrs[name] === null) delete values[name];
					}
					t.modify(values);					
					t.configWindow = null;
				},
				Cancel: function() {
					t.configWindow.hide();
					t.configWindow = null;
				} 
			}
		});
		for (var i=0; i<settings.order.length; i++) {
			var name = settings.order[i];
			if (settings.special[name]) this.configWindow.add(settings.special[name]);
			else if (this.caps.attrs[name]) this.configWindow.autoAdd(this.caps.attrs[name], this.data.attrs[name], this.attrEnabled(name));
		}
		if (settings.unknown) {
			for (var name in this.caps.attrs) {
				if (settings.order.indexOf(name) >= 0) continue; //do not repeat ordered fields
				if (settings.ignore.indexOf(name) >= 0) continue;
				if (settings.special[name]) this.configWindow.add(settings.special[name]);
				else if (this.caps.attrs[name]) this.configWindow.autoAdd(this.caps.attrs[name], this.data.attrs[name], this.attrEnabled(name));
			}
		}
		this.configWindow.show();
		this.triggerEvent({operation: "attribute-dialog"});
	},
	update: function() {
		var t = this;
		this.triggerEvent({operation: "update", phase: "begin"});
		ajax({
			url: this.component_type+'/'+this.id+'/info',
		 	successFn: function(result) {
		 		t.updateData(result);
		 		t.setBusy(false);
				t.triggerEvent({operation: "update", phase: "end"});
		 	},
		 	errorFn: function() {
		 		t.setBusy(false);
				t.triggerEvent({operation: "update", phase: "error"});
		 	}
		});
	},
	updateDependent: function() {
	},
	modify: function(attrs) {
		this.setBusy(true);
		for (var name in attrs) {
			if (this.attrEnabled(name)) this.data.attrs[name] = attrs[name];
			else delete attrs[name];
		}
		this.triggerEvent({operation: "modify", phase: "begin", attrs: attrs});
		var t = this;
		ajax({
			url: this.component_type+'/'+this.id+'/modify',
		 	data: {attrs: attrs},
		 	successFn: function(result) {
		 		t.updateData(result);
		 		t.setBusy(false);
				t.triggerEvent({operation: "modify", phase: "end", attrs: attrs});
		 	},
		 	errorFn: function(error) {
		 		alert(error);
		 		t.update();
				t.triggerEvent({operation: "modify", phase: "error", attrs: attrs});
		 	}
		});
	},
	modify_value: function(name, value) {
		var attrs = {};
		attrs[name] = value;
		this.modify(attrs);
	},
	action: function(action, options) {
		var options = options || {};
		if ((action=="destroy"||action=="stop") && !options.noask && this.editor.options.safe_mode && ! confirm("Do you want to " + action + " this "+this.component_type+"?")) return;
		this.setBusy(true);
		var params = options.params || {};
		this.triggerEvent({operation: "action", phase: "begin", action: action, params: params});
		var t = this;
		ajax({
			url: this.component_type+'/'+this.id+'/action',
		 	data: {action: action, params: params},
		 	successFn: function(result) {
		 		t.updateData(result[1]);
		 		t.setBusy(false);
		 		if (options.callback) options.callback(t, result[0], result[1]);
				t.triggerEvent({operation: "action", phase: "end", action: action, params: params});
				t.updateDependent();
		 	},
		 	errorFn: function(error) {
		 		alert(error);
		 		t.update();
				t.triggerEvent({operation: "action", phase: "error", action: action, params: params});
		 	}
		});
	},
	onConnected: function() {
	}
});

var ConnectionAttributeWindow = AttributeWindow.extend({
	init: function(options, con) {
		options.helpTarget = "/help/editor/configwindow_connection";
		this._super(options);
		if (con.attrEnabled("emulation")) {
			this.table.append($("<tr/>").append($("<th colspan=4><big>Link emulation</big></th>")));
			this.emulation_elements = [];
			var t = this;
			var el = new CheckboxElement({
				name: "emulation",
				value: con.data.attrs.emulation,
				callback: function(el, value) {
					t.updateEmulationStatus(value);
				}
			});
			this.elements.push(el);
			this.table.append($("<tr/>").append($("<td>Enabled</td>")).append($("<td colspan=3/>").append(el.getElement())));
			//direction arrows
			var size = 30;
			var _div = '<div style="width: '+size+'px; height: '+size+'px;"/>';
			var dir1 = $(_div); var dir2 = $(_div);
			var canvas1 = Raphael(dir1[0], size, size);
			var canvas2 = Raphael(dir2[0], size, size);
			var _path1 = "M 0.1 0.5 L 0.9 0.5";
			var _path2 = "M 0.7 0.5 L 0.4 0.3 M 0.7 0.5 L 0.4 0.7";
			var _transform1 = "R"+con.getAngle()+",0.5,0.5S"+size+","+size+",0,0";
			var _transform2 = "R"+(con.getAngle()+180)+",0.5,0.5S"+size+","+size+",0,0";
			var _attrs = {"stroke-width": 2, stroke: "red", "stroke-linecap": "round", "stroke-linejoin": "round"};
			canvas1.path(_path1).transform(_transform1);
			canvas1.path(_path2).transform(_transform1).attr(_attrs);
			canvas2.path(_path1).transform(_transform2);
			canvas2.path(_path2).transform(_transform2).attr(_attrs);
			var name1 = con.elements[0].name();
			var name2 = con.elements[1].name();
			if (con.elements[0].id > con.elements[1].id) {
				var t = name1;
				name1 = name2;
				name2 = t;
			}
			var fromDir = $("<div>From " + name1 + "<br/>to " + name2 + "</div>");
			var toDir = $("<div>From " + name2 + " <br/>to " + name1 + "</div>");
			this.table.append($('<tr/>')
				.append($("<td>Direction</td>"))
				.append($('<td align="middle"/>').append(fromDir).append(dir1))
				.append($('<td align="middle"/>').append(toDir).append(dir2))
				.append($('<td>&nbsp;</td>'))
			);
			//simple fields
			var order = ["bandwidth", "delay", "jitter", "distribution", "lossratio", "duplicate", "corrupt"];
			for (var i = 0; i < order.length; i++) {
				var name = order[i];
				var el_from = this.autoElement(con.caps.attrs[name+"_from"], con.data.attrs[name+"_from"], true)
				this.elements.push(el_from);
				this.emulation_elements.push(el_from);
				var el_to = this.autoElement(con.caps.attrs[name+"_to"], con.data.attrs[name+"_to"], true)
				this.elements.push(el_to);
				this.emulation_elements.push(el_to);
				this.table.append($("<tr/>")
					.append($("<td/>").append(con.caps.attrs[name+"_to"].desc))
					.append($("<td/>").append(el_from.getElement()))
					.append($("<td/>").append(el_to.getElement()))
					.append($("<td/>").append(con.caps.attrs[name+"_to"].unit))
				);
			}
			this.updateEmulationStatus(con.data.attrs.emulation);
			this.table.append($("<tr/>").append($("<td colspan=4>&nbsp;</td>")));
		}
		if (con.attrEnabled("capturing")) {
			var t = this;
			this.table.append($("<tr/>").append($("<th colspan=4><big>Packet capturing</big></th>")));
			this.capturing_elements = [];
			var el = new CheckboxElement({
				name: "capturing",
				value: con.data.attrs.capturing,
				callback: function(el, value) {
					t.updateCapturingStatus(value);
				}
			});
			this.elements.push(el);
			this.table.append($("<tr/>").append($("<td>Enabled</td>")).append($("<td colspan=3/>").append(el.getElement())));
			var order = ["capture_mode", "capture_filter"];
			for (var i = 0; i < order.length; i++) {
				var name = order[i];
				var el = this.autoElement(con.caps.attrs[name], con.data.attrs[name], con.attrEnabled(name));
				this.capturing_elements.push(el);
				this.elements.push(el);
				this.table.append($("<tr/>")
					.append($("<td/>").append(con.caps.attrs[name].desc))
					.append($("<td colspan=3/>").append(el.getElement()))
				);
			}
			this.updateCapturingStatus(con.data.attrs.capturing);
		}
	},
	updateEmulationStatus: function(enabled) {
		for (var i=0; i<this.emulation_elements.length; i++)
			 this.emulation_elements[i].setEnabled(enabled);
	},
	updateCapturingStatus: function(enabled) {
		for (var i=0; i<this.capturing_elements.length; i++)
			 this.capturing_elements[i].setEnabled(enabled);
	}
});


var Connection = Component.extend({
	init: function(topology, data, canvas) {
		this.component_type = "connection";
		data.type = data.type || "bridge";
		this._super(topology, data, canvas);
		this.elements = [];
		this.segment = -1;
	},
	fromElement: function() {
		return this.elements[0].id < this.elements[1].id ? this.elements[0] : this.elements[1];
	},
	toElement: function() {
		return this.elements[0].id >= this.elements[1].id ? this.elements[0] : this.elements[1];
	},
	otherElement: function(me) {
		for (var i=0; i<this.elements.length; i++) if (this.elements[i].id != me.id) return this.elements[i];
	},
	onClicked: function() {
		this.editor.onConnectionSelected(this);
	},
	isRemovable: function() {
		return this.actionEnabled("(remove)");
	},
	getCenter: function() {
		if (this.path) return this.path.getPointAtLength(this.path.getTotalLength()/2);
		else {
			var pos1 = this.elements[0].getAbsPos();
			var pos2 = this.elements[1].getAbsPos();
			return {x: (pos1.x + pos2.x)/2, y: (pos1.y + pos2.y)/2}; 
		}
	},
	getPath: function() {
		var pos1 = this.elements[0].getAbsPos();
		var pos2 = this.elements[1].getAbsPos();
		var path = "M"+pos1.x+" "+pos1.y+"L"+pos2.x+" "+pos2.y;
		//TODO: use bezier loop for very short connections
		return path;
	},
	getAbsPos: function() {
		return this.getCenter();
	},
	getAngle: function() {
		var pos1 = this.toElement().getAbsPos();
		var pos2 = this.fromElement().getAbsPos();
		return Raphael.angle(pos1.x, pos1.y, pos2.x, pos2.y);
	},
	paint: function() {
		this.path = this.canvas.path(this.getPath());
		this.path.toBack();
		var pos = this.getAbsPos();
		this.handle = this.canvas.rect(pos.x-5, pos.y-5, 10, 10).attr({fill: "#4040FF", transform: "R"+this.getAngle()});
		$(this.handle.node).attr("class", "tomato connection");
		this.handle.node.obj = this;
		var t = this;
		$(this.handle.node).click(function() {
			t.onClicked();
		})
		this.paintUpdate();
		for (var i=0; i<this.elements.length; i++) this.elements[i].paintUpdate();
	},
	paintRemove: function(){
		this.path.remove();
		this.handle.remove();
	},
	setSegment: function(segment){
		this.segment = segment;
		this.paintUpdate();
	},
	paintUpdate: function(){
		var colors = ["#2A4BD7", "#AD2323", "#1D6914", "#814A19", "#8126C0", "#FFEE33", "#FF9233", "#29D0D0", "#9DAFFF", "#81C57A", "#FFCDF3"];
		var color = colors[this.segment % colors.length] || "#505050";
		var attrs = this.data.attrs;
		var le = attrs && attrs.emulation && (attrs.delay_to || attrs.jitter_to || attrs.lossratio_to || attrs.duplicate_to || attrs.corrupt_to
				         || attrs.delay_from || attrs.jitter_from || attrs.lossratio_from || attrs.duplicate_from || attrs.corrupt_from);
		var bw = 10000000;
		if (attrs && attrs.emulation) bw = Math.min(attrs.bandwidth_to, attrs.bandwidth_from); 
		this.path.attr({stroke: color, "stroke-dasharray": [le ? "-" : ""]});
		this.path.attr({"stroke-width": bw < 10000 ? 1 : ( bw > 10000 ? 4 : 2.5 )});
		this.path.attr({path: this.getPath()});
		var pos = this.getAbsPos();
		this.handle.attr({x: pos.x-5, y: pos.y-5, transform: "R"+this.getAngle()});
		this.handle.conditionalClass("removable", this.isRemovable());
	},
	calculateSegment: function(els, cons) {
		if (! els) els = [];
		if (! cons) cons = [];
		if (cons.indexOf(this.id) >= 0) return {elements: els, connections: cons};
		cons.push(this.id);
		for (var i=0; i < this.elements.length; i++) {
			var res = this.elements[i].calculateSegment(els, cons);
			els = res.elements;
			cons = res.connections;
		}
		return {elements: els, connections: cons};
	},
	action_start: function() {
		this.action("start");
	},
	action_stop: function() {
		this.action("stop");
	},
	action_prepare: function() {
		this.action("prepare");
	},
	action_destroy: function() {
		this.action("destroy");
	},
	captureDownloadable: function() {
		return this.actionEnabled("download_grant") && this.data.attrs.capturing && this.data.attrs.capture_mode == "file";
	},
	downloadCapture: function() {
		this.action("download_grant", {callback: function(con, res) {
			var name = con.topology.data.attrs.name + "_capture_" + con.id + ".pcap";
			var url = "http://" + con.data.attrs.host + ":" + con.data.attrs.host_fileserver_port + "/" + res + "/download?name=" + encodeURIComponent(name); 
			window.location.href = url;
		}})
	},
	viewCapture: function() {
		this.action("download_grant", {params: {limitSize: 1024*1024}, callback: function(con, res) {
			var url = "http://" + con.data.attrs.host + ":" + con.data.attrs.host_fileserver_port + "/" + res + "/download"; 
			window.open("http://www.cloudshark.org/view?url="+url, "_newtab");
		}})
	},
	liveCaptureEnabled: function() {
		return this.actionEnabled("download_grant") && this.data.attrs.capturing && this.data.attrs.capture_mode == "net";
	},
	liveCaptureInfo: function() {
		var host = this.data.attrs.host;
		var port = this.data.attrs.capture_port;
		var cmd = "wireshark -k -i <( nc "+host+" "+port+" )";
		new Window({
			title: "Live capture Information", 
			content: '<p>Host: '+host+'<br />Port: '+port+"</p><p>Start live capture via: <pre>"+cmd+"</pre></p>", 
			autoShow: true,
			width: 600
		});
	},
	showConfigWindow: function() {
		var absPos = this.getAbsPos();
		var wsPos = this.editor.workspace.container.position();
		var t = this;
		this.configWindow = new ConnectionAttributeWindow({
			title: "Attributes",
			width: 500,
			buttons: {
				Save: function() {
					t.configWindow.hide();
					var values = t.configWindow.getValues();
					for (var name in values) if (values[name] === t.data.attrs[name]) delete values[name];
					t.modify(values);					
					t.configWindow = null;
				},
				Cancel: function() {
					t.configWindow.hide();
					t.configWindow = null;
				} 
			}
		}, this);
		this.configWindow.show();
		this.triggerEvent({operation: "attribute-dialog"});
	},
	remove: function(callback, ask) {
		if (this.busy) return;
		if (ask && this.editor.options.safe_mode && ! confirm("Do you want to delete this connection?")) return;
		this.setBusy(true);
		this.triggerEvent({operation: "remove", phase: "begin"});
		var t = this;
		ajax({
			url: 'connection/'+this.id+'/remove',
		 	successFn: function(result) {
		 		t.paintRemove();
		 		delete t.topology.connections[t.id];
		 		for (var i=0; i<t.elements.length; i++) delete t.elements[i].connection;
		 		t.setBusy(false);
		 		if (callback) callback(t);
		 		t.topology.onUpdate();
				t.triggerEvent({operation: "remove", phase: "end"});
				for (var i=0; i<t.elements.length; i++) 
					if (t.elements[i].isRemovable() && t.topology.elements[t.elements[i].id])
						t.elements[i].remove();
		 	},
		 	errorFn: function(error) {
		 		alert(error);
		 		t.setBusy(false);
				t.triggerEvent({operation: "remove", phase: "error"});
		 	}
		});
	},
	name: function() {
		return this.fromElement().name() + " &#x21C4; " + this.toElement().name();
	}
});

var createConnectionMenu = function(obj) {
	var menu = {
		callback: function(key, options) {},
		items: {
			"header": {
				html:'<span>Connection '+obj.name()+'</span>', type:"html"
			},
			"usage": {
				name:"Resource usage",
				icon:"usage",
				callback: function(){
					obj.showUsage();
				}
			},
			"sep1": "---",
			"cloudshark_capture": obj.captureDownloadable() ? {
				name:"View capture in Cloudshark",
				icon:"cloudshark",
				callback: function(){
					obj.viewCapture();
				}
			} : null,
			"download_capture": obj.captureDownloadable() ? {
				name:"Download capture",
				icon:"download-capture",
				callback: function(){
					obj.downloadCapture();
				}
			} : null,
			"live_capture": obj.liveCaptureEnabled() ? {
				name:"Live capture info",
				icon:"live-capture",
				callback: function(){
					obj.liveCaptureInfo();
				}
			} : null,
			"no_capture": (! obj.liveCaptureEnabled() && ! obj.captureDownloadable()) ? {
				name:"No captures",
				icon:"no-capture"
			} : null,
			"sep2": "---",
			"configure": {
				name:'Configure',
				icon:'configure',
				callback: function(){
					obj.showConfigWindow();
				}
			},
			"debug": obj.editor.options.debug_mode ? {
				name:'Debug',
				icon:'debug',
				callback: function(){
					obj.showDebugInfo();
				}
			} : null,
			"sep3": "---",
			"remove": obj.isRemovable() ? {
				name:'Delete',
				icon:'remove',
				callback: function(){
					obj.remove(null, true);
				}
			} : null
		}
	};
	for (var name in menu.items) {
		if (! menu.items[name]) delete menu.items[name]; 
	}
	return menu;
};


var Element = Component.extend({
	init: function(topology, data, canvas) {
		this.component_type = "element";
		this._super(topology, data, canvas);
		this.children = [];
		this.connection = null;
	},
	rextfvStatusSupport: function() {
		if ('rextfv_supported' in this.data.attrs)
			return this.data.attrs.rextfv_supported
		else
			return false;
	},
	openRexTFVStatusWindow: function() {
		window.open('../element/'+this.id+'/rextfv_status', '_blank', "innerWidth=350,innerheight=420,status=no,toolbar=no,menubar=no,location=no,hotkeys=no,scrollbars=no");
		this.triggerEvent({operation: "rextfv-status"});
	},
	onDragged: function() {
		if (!this.isMovable()) return;
		this.modify_value("_pos", this.getPos());
	},
	onClicked: function() {
		this.editor.onElementSelected(this);
	},
	isMovable: function() {
		return (!this.editor.options.fixed_pos) && this.editor.mode == Mode.select;
	},
	isConnectable: function() {
		if (this.connection) return false;
		if (! this.caps.children) return false;
		for (var ch in this.caps.children)
			if (this.caps.children[ch].indexOf(this.data.state) >= 0)
				return true;
		return false;
	},
	isRemovable: function() {
		return this.actionEnabled("(remove)");
	},
	isEndpoint: function() {
		return true;
	},
	getUsedAddress: function() {
		if (this.data.attrs.use_dhcp) return "dhcp";
		if (! this.data.attrs.ip4address) return null;
		res = /10.0.([0-9]+).([0-9]+)\/[0-9]+/.exec(this.data.attrs.ip4address);
		if (! res) return res;
		return [parseInt(res[1]), parseInt(res[2])];
	},
	getAddressHint: function() {
		var segs = this.topology.getNetworkSegments();
		for (var i=0; i < segs.length; i++) {
			var seg = segs[i];
			if (seg.elements.indexOf(this.id)>=0) break;
		}
		//Determine major usage counts in segment
		var usedMajors = {};
		for (var i=0; i < seg.elements.length; i++) {
			var el = this.topology.elements[seg.elements[i]];
			if (el.data.type == "external_network_endpoint") return "dhcp";
			var addr = el.getUsedAddress();
			if (! addr) continue;
			if (addr == "dhcp")	usedMajors.dhcp = (usedMajors.dhcp || 0) + 1;
			else usedMajors[addr[0]] = (usedMajors[addr[0]] || 0) + 1;
		}
		//Find the most common major
		var major = null;
		var majorCount = 0;
		for (var m in usedMajors) {
			if (usedMajors[m] > majorCount) {
				major = m;
				majorCount = usedMajors[m]; 
			}
		}
		if (major == "dhcp") return "dhcp";
		if (! major) {
			//If no major in segment so far, find free global major
			var usedMajors = {};
			for (var i=0; i < segs.length; i++) {
				var seg = segs[i];
				for (var j=0; j < seg.elements.length; j++) {
					var el = this.topology.elements[seg.elements[j]];
					var addr = el.getUsedAddress();
					if (! addr || addr == "dhcp") continue;
					usedMajors[addr[0]] = (usedMajors[addr[0]] || 0) + 1; 
				}
			}
			var major = 0;
			while (usedMajors[major]) major++;
			return [major, 1];
		} else {
			//Find free minor for the major
			major = parseInt(major);
			var usedMinors = {};
			for (var j=0; j < seg.elements.length; j++) {
				var el = this.topology.elements[seg.elements[j]];
				var addr = el.getUsedAddress();
				if (! addr || addr == "dhcp") continue;
				if (addr[0] == major) usedMinors[addr[1]] = (usedMinors[addr[1]] || 0) + 1; 
			}
			var minor = 1;
			while (usedMinors[minor]) minor++;
			return [major, minor];			
		}
	},
	calculateSegment: function(els, cons) {
		if (! els) els = [];
		if (! cons) cons = [];
		if (els.indexOf(this.id) >= 0) return {elements: els, connections: cons};
		els.push(this.id);
		if (this.connection) {
			var res = this.connection.calculateSegment(els, cons);
			els = res.elements;
			cons = res.connections;
		}
		if (this.isEndpoint()) return {elements: els, connections: cons};
		for (var i=0; i < this.children.length; i++) {
			var res = this.children[i].calculateSegment(els, cons);
			els = res.elements;
			cons = res.connections;
		}
		if (this.parent) {
			var res = this.parent.calculateSegment(els, cons);
			els = res.elements;
			cons = res.connections;
		}
		return {elements: els, connections: cons};
	},
	enableClick: function(obj) {
		obj.click(function() {
			this.onClicked();
		}, this);
	},
	enableDragging: function(obj) {
		obj.drag(function(dx, dy, x, y) { //move
			if (!this.isMovable()) return;
			this.setAbsPos({x: this.opos.x + dx, y: this.opos.y + dy});
		}, function() { //start
			if (!this.isMovable()) return false;
			this.opos = this.getAbsPos();
		}, function() { //stop
			var pos = this.getAbsPos();
			if (! this.opos) return;
			if (pos.x == this.opos.x && pos.y == this.opos.y) return;
			this.onDragged();
		}, this, this, this);
	},
	getConnectTarget: function() {
		return this;
	},
	getPos: function() {
		if (! this.data.attrs._pos) this.data.attrs._pos = {x: Math.random(), y: Math.random()};
		return this.data.attrs._pos;
	},
	setPos: function(pos) {
		if (this.editor.options.fixed_pos) return;
		this.data.attrs._pos = {x: Math.min(1, Math.max(0, pos.x)), y: Math.min(1, Math.max(0, pos.y))};
		this.onPosChanged(true);
	},
	onPosChanged: function(con) {
		this.paintUpdate();
		for (var i=0; i<this.children.length; i++) this.children[i].onPosChanged(con);
		if (con && this.connection) {
			this.connection.otherElement(this).onPosChanged(false);
			this.connection.paintUpdate();
		}
	},
	getAbsPos: function() {
		return this.canvas.absPos(this.getPos());
	},
	setAbsPos: function(pos) {
		var grid = this.editor.options.grid_size;
		if (this.editor.options.snap_to_grid) pos = {x: Math.round(pos.x/grid)*grid, y: Math.round(pos.y/grid)*grid};
		this.setPos(this.canvas.relPos(pos));
	},
	openConsole: function() {
	    window.open('../element/'+this.id+'/console', '_blank', "innerWidth=745,innerheight=400,status=no,toolbar=no,menubar=no,location=no,hotkeys=no,scrollbars=no");
		this.triggerEvent({operation: "console-dialog"});
	},
	openConsoleNoVNC: function() {
	    window.open('../element/'+this.id+'/console_novnc', '_blank', "innerWidth=760,innerheight=440,status=no,toolbar=no,menubar=no,location=no,hotkeys=no,scrollbars=no");
		this.triggerEvent({operation: "console-dialog"});
	},
	openVNCurl: function() {
		var host = this.data.attrs.host;
		var port = this.data.attrs.vncport;
		var passwd = this.data.attrs.vncpassword;
		var link = "vnc://:" + passwd + "@" + host + ":" + port;
	    window.open(link, '_self');
		this.triggerEvent({operation: "console-dialog"});
	},
	showVNCinfo: function() {
		var host = this.data.attrs.host;
		var port = this.data.attrs.vncport;
		var wport = this.data.attrs.websocket_port;
		var passwd = this.data.attrs.vncpassword;
		var link = "vnc://:" + passwd + "@" + host + ":" + port;
 		var win = new Window({
 			title: "VNC info",
 			content: '<p>Link: <a href="'+link+'">'+link+'</a><p>Host: '+host+"</p><p>Port: "+port+"</p><p>Websocket-Port: "+wport+"</p><p>Password: <pre>"+passwd+"</pre></p>",
 			autoShow: true
 		});
		this.triggerEvent({operation: "console-dialog"});
	},
	consoleAvailable: function() {
		return this.data.attrs.vncpassword && this.data.attrs.vncport && this.data.attrs.host && this.data.state == "started";
	},
	downloadImage: function() {
		this.action("download_grant", {callback: function(el, res) {
			var name = el.topology.data.attrs.name + "_" + el.data.attrs.name;
			switch (el.data.type) {
				case "kvmqm":
				case "kvm":
					name += ".qcow2";
					break;
				case "openvz":
					name += ".tar.gz";
					break;
				case "repy":
					name += ".repy";
					break;
			}
			var url = "http://" + el.data.attrs.host + ":" + el.data.attrs.host_fileserver_port + "/" + res + "/download?name=" + encodeURIComponent(name); 
			window.location.href = url;
		}})
	},
	downloadRexTFV: function() {
		this.action("rextfv_download_grant", {callback: function(el, res) {
			var name = el.topology.data.attrs.name + "_" + el.data.attrs.name + '_rextfv.tar.gz';
			var url = "http://" + el.data.attrs.host + ":" + el.data.attrs.host_fileserver_port + "/" + res + "/download?name=" + encodeURIComponent(name); 
			window.location.href = url;
		}})
	},
	uploadImage: function() {
		this.action("upload_grant", {callback: function(el, res) {
			var url = "http://" + el.data.attrs.host + ":" + el.data.attrs.host_fileserver_port + "/" + res + "/upload";
			var div = $('<div/>');
			var iframe = $('<iframe id="upload_target" name="upload_target">Test</iframe>');
			// iframe.load will be triggered a moment after iframe is added to body
			// this happens in a seperate thread so we cant simply wait for it (esp. on slow Firefox)
			iframe.load(function(){ 
				iframe.off("load");
				iframe.load(function(){
					iframe.remove();
					info.hide();
					el.action("upload_use");
				});
				var info = new Window({title: "Upload image", content: div, autoShow: true, width:300});
			});
			iframe.css("display", "none");
			$('body').append(iframe);
			div.append('<form method="post" enctype="multipart/form-data" action="'+url+'" target="upload_target"><input type="file" name="upload"/><br/><input type="submit" value="upload"/></form>');
		}});
	},
	uploadRexTFV: function() {
		this.action("rextfv_upload_grant", {callback: function(el, res) {
			var url = "http://" + el.data.attrs.host + ":" + el.data.attrs.host_fileserver_port + "/" + res + "/upload";
			var div = $('<div/>');
			var iframe = $('<iframe id="upload_target" name="upload_target">Test</iframe>');
			// iframe.load will be triggered a moment after iframe is added to body
			// this happens in a seperate thread so we cant simply wait for it (esp. on slow Firefox)
			iframe.load(function(){ 
				iframe.off("load");
				iframe.load(function(){
					iframe.remove();
					info.hide();
					el.action("rextfv_upload_use");
				});
				var info = new Window({title: "Upload RexTFV Archive", content: div, autoShow: true, width:300});
			});
			iframe.css("display", "none");
			$('body').append(iframe);
			div.append('<form method="post" enctype="multipart/form-data" action="'+url+'" target="upload_target"><input type="file" name="upload"/><br/><input type="submit" value="upload"/></form>');
		}});
	},
	action_start: function() {
		this.action("start");
	},
	action_stop: function() {
		this.action("stop");
	},
	action_prepare: function() {
		this.action("prepare");
	},
	action_destroy: function() {
		this.action("destroy");
	},
	updateDependent: function() {
		for (var i = 0; i < this.children.length; i++) {
			this.children[i].update();
			this.children[i].updateDependent();
		}
		if (this.connection) {
			this.connection.update();
			this.connection.updateDependent();			
		}
	},
	removeChild: function(ch) {
		for (var i = 0; i < this.children.length; i++)
	     if (this.children[i].id == ch.id)
	      this.children.splice(i, 1);
	},
	remove: function(callback, ask) {
		if (this.busy) return;
		if (ask && this.editor.options.safe_mode && ! confirm("Do you want to delete this element?")) return;
		this.setBusy(true);
		this.triggerEvent({operation: "remove", phase: "begin"});
		var t = this;
		var removed = false;
		var waiter = function(obj) {
			t.removeChild(obj);
			if (t.children.length) return;
			if (removed) return;
			removed = true;
			ajax({
				url: 'element/'+t.id+'/remove',
			 	successFn: function(result) {
			 		t.paintRemove();
			 		delete t.topology.elements[t.id];
			 		if (t.parent) t.parent.removeChild(t);
			 		t.setBusy(false);
			 		if (callback) callback(t);
			 		t.topology.onUpdate();
					t.triggerEvent({operation: "remove", phase: "end"});
			 	},
			 	errorFn: function(error) {
			 		alert(error);
			 		t.setBusy(false);
					t.triggerEvent({operation: "remove", phase: "error"});
			 	}
			});			
		}
		for (var i=0; i<this.children.length; i++) this.children[i].remove(waiter);
		if (this.connection) this.connection.remove();
		waiter(this);
	},
	name: function() {
		var name = this.data.attrs.name;
		if (this.parent) name = this.parent.name() + "." + name;
		return name;
	}
});

var createElementMenu = function(obj) {
	var menu = {
		callback: function(key, options) {},
		items: {
			"header": {html:'<span>Element '+obj.name()+'</span>', type:"html"},
			"connect": obj.isConnectable() ? {
				name:'Connect',
				icon:'connect',
				callback: function(){
					obj.editor.onElementConnectTo(obj);
				}
			} : null,
			"start": obj.actionEnabled("start") ? {
				name:'Start',
				icon:'start',
				callback: function(){
					obj.action_start();
				}
			} : null,
			"stop": obj.actionEnabled("stop") ? {
				name:"Stop",
				icon:"stop",
				callback: function(){
					obj.action_stop();
				}
			} : null,
			"prepare": obj.actionEnabled("prepare") ? {
				name:"Prepare",
				icon:"prepare",
				callback: function(){
					obj.action_prepare();
				}
			} : null,
			"destroy": obj.actionEnabled("destroy") ? {
				name:"Destroy",
				icon:"destroy",
				callback: function(){
					obj.action_destroy();
				}
			} : null,
			"sep2": "---",
			"console": obj.consoleAvailable() ? {
				name:"Console",
				icon:"console",
				items: {
					"console_novnc": {
						name:"NoVNC (HTML5+JS)",
						icon:"novnc",
						callback: function(){
							obj.openConsoleNoVNC();
						}
					},
					"console_java": {
						name: "Java applet",
						icon: "java-applet",
						callback: function(){
							obj.openConsole();
						}
					}, 
					"console_link": {
						name:"vnc:// link",
						icon:"console",
						callback: function(){
							obj.openVNCurl();
						}
					},
					"console_info": {
						name:"VNC Information",
						icon:"info",
						callback: function(){
							obj.showVNCinfo();
						}
					},
				}
			} : null,
			"usage": {
				name:"Resource usage",
				icon:"usage",
				callback: function(){
					obj.showUsage();
				}
			},
			"download_image": obj.actionEnabled("download_grant") ? {
				name:"Download image",
				icon:"drive",
				callback: function(){
					obj.downloadImage();
				}
			} : null,
			"upload_image": obj.actionEnabled("upload_grant") ? {
				name:"Upload image",
				icon:"drive",
				callback: function(){
					obj.uploadImage();
				}
			} : null,
			"rextfv": obj.actionEnabled("rextfv_download_grant") || obj.actionEnabled("rextfv_upload_grant") || obj.rextfvStatusSupport() ? {
				name:"Executable archive",
				icon:"rextfv",
				items: { 
					"download_rextfv": obj.actionEnabled("rextfv_download_grant") ? {
						name:"Download Archive",
						icon:"rextfv",
						callback: function(){
							obj.downloadRexTFV();
						}
					} : null,
					"upload_rextfv": obj.actionEnabled("rextfv_upload_grant") ? {
						name:"Upload Archive",
						icon:"rextfv",
						callback: function(){
							obj.uploadRexTFV();
						}
					} : null,
					"rextfv_status": obj.rextfvStatusSupport() ? {
						name:"Status",
						icon:"rextfv",
						callback: function(){
							obj.openRexTFVStatusWindow();
						}
					} : null,
				},
			} : null,
			"sep3": "---",
			"configure": {
				name:'Configure',
				icon:'configure',
				callback:function(){
					obj.showConfigWindow();
				}
			},
			"debug": obj.editor.options.debug_mode ? {
				name:'Debug',
				icon:'debug',
				callback: function(){
					obj.showDebugInfo();
				}
			} : null,
			"sep4": "---",
			"remove": obj.isRemovable() ? {
				name:'Delete',
				icon:'remove',
				callback: function(){
					obj.remove(null, true);
				}
			} : null
		}
	};
	for (var name in menu.items) {
		if (! menu.items[name]) {
			delete menu.items[name];
			continue;
		}
		var menu2 = menu.items[name];
		if (menu2.items) for (var name2 in menu2.items) if (! menu2.items[name2]) delete menu2.items[name2]; 
	}
	return menu;
};

var createComponentMenu = function(obj) {
	switch (obj.component_type) {
		case "element":
			return createElementMenu(obj);
		case "connection":
			return createConnectionMenu(obj);
	}
};

['right', 'longclick'].forEach(function(trigger) {
	$.contextMenu({
		selector: 'rect,circle', //filtering on classes of SVG objects does not work
		trigger: trigger,
		build: function(trigger, e) {
			return createComponentMenu(trigger[0].obj);
		}
	});	
});

var UnknownElement = Element.extend({
	paint: function() {
		var pos = this.getAbsPos();
		this.circle = this.canvas.circle(pos.x, pos.y, 15).attr({fill: "#CCCCCC"});
		this.innerText = this.canvas.text(pos.x, pos.y, "?").attr({"font-size": 25});
		this.text = this.canvas.text(pos.x, pos.y+22, this.data.type + ": " + this.data.attrs.name);
		this.enableDragging(this.circle);
		this.enableDragging(this.innerText);
		this.enableClick(this.circle);
		$(this.circle.node).attr("class", "tomato element selectable");
		this.enableClick(this.innerText);
	},
	paintRemove: function(){
		this.circle.remove();
		this.innerText.remove();
		this.text.remove();
	},
	paintUpdate: function() {
		var pos = this.getAbsPos();
		this.circle.attr({cx: pos.x, cy:pos.y});
		this.innerText.attr({x: pos.x, y:pos.y});
		this.text.attr({x: pos.x, y: pos.y+22});
		this.enableDragging(this.circle);
		this.circle.node.obj = this;
	}
});

var IconElement = Element.extend({
	init: function(topology, data, canvas) {
		this._super(topology, data, canvas);
		this.iconUrl = "img/" + this.data.type + "32.png";
		this.iconSize = {x: 32, y:32};
		this.busy = false;
	},
	isMovable: function() {
		return this._super() && !this.busy;
	},
	setBusy: function(busy) {
		this._super(busy);
		this.paintUpdate();
	},
	updateStateIcon: function() {
		if (this.busy) {
			this.stateIcon.attr({src: "img/loading.gif", opacity: 1.0});
			return;			
		}
		switch (this.data.state) {
			case "started":
				this.stateIcon.attr({src: "img/started.png", opacity: 1.0});
				break;
			case "prepared":
				this.stateIcon.attr({src: "img/prepared.png", opacity: 1.0});
				break;
			case "created":
			default:
				this.stateIcon.attr({src: "img/pixel.png", opacity: 0.0});
				break;
		}
	},
	getRectObj: function() {
		return this.rect[0];
	},
	paint: function() {
		var pos = this.canvas.absPos(this.getPos());
		this.icon = this.canvas.image(this.iconUrl, pos.x-this.iconSize.x/2, pos.y-this.iconSize.y/2, this.iconSize.x, this.iconSize.y);
		this.text = this.canvas.text(pos.x, pos.y+this.iconSize.y/2+5, this.data.attrs.name);
		this.stateIcon = this.canvas.image("img/pixel.png", pos.x+this.iconSize.x/2-10, pos.y+this.iconSize.y/2-10, 16, 16);
		this.stateIcon.attr({opacity: 0.0});
		this.updateStateIcon();
		//hide icon below rect to disable special image actions on some browsers
		this.rect = this.canvas.rect(pos.x-this.iconSize.x/2, pos.y-this.iconSize.y/2-5, this.iconSize.x, this.iconSize.y + 10).attr({opacity: 0.0, fill:"#FFFFFF"});
		this.enableDragging(this.rect);
		this.enableClick(this.rect);
		this.rect.node.obj = this;
		this.rect.conditionalClass("tomato", true);
		this.rect.conditionalClass("element", true);
		this.rect.conditionalClass("selectable", true);
		this.rect.conditionalClass("connectable", this.isConnectable());
		this.rect.conditionalClass("removable", this.isRemovable());
	},
	paintRemove: function(){
		this.icon.remove();
		this.text.remove();
		this.stateIcon.remove();
		this.rect.remove();
	},
	paintUpdate: function() {
		var pos = this.getAbsPos();
		this.icon.attr({x: pos.x-this.iconSize.x/2, y: pos.y-this.iconSize.y/2});
		this.stateIcon.attr({x: pos.x+this.iconSize.x/2-10, y: pos.y+this.iconSize.y/2-10});
		this.rect.attr({x: pos.x-this.iconSize.x/2, y: pos.y-this.iconSize.y/2+5});
		this.text.attr({x: pos.x, y: pos.y+this.iconSize.y/2+5, text: this.data.attrs.name});
		this.updateStateIcon();
		$(this.rect.node).attr("class", "tomato element selectable");
		this.rect.conditionalClass("connectable", this.isConnectable());
		this.rect.conditionalClass("removable", this.isRemovable());
	}
});

var VPNElement = IconElement.extend({
	init: function(topology, data, canvas) {
		this._super(topology, data, canvas);
		this.iconUrl = "img/" + this.data.attrs.mode + "32.png";
		this.iconSize = {x: 32, y:16};
	},
	isConnectable: function() {
		return this._super() && !this.busy;
	},
	isRemovable: function() {
		return this._super() && !this.busy;
	},
	isEndpoint: function() {
		return false;
	},
	getConnectTarget: function(callback) {
		return this.topology.createElement({type: "tinc_endpoint", parent: this.data.id}, callback);
	}
});

var ExternalNetworkElement = IconElement.extend({
	init: function(topology, data, canvas) {
		this._super(topology, data, canvas);
		this.iconUrl = "img/" + this.data.attrs.kind.split("/")[0] + "32.png";
		this.iconSize = {x: 32, y:32};
	},
	configWindowSettings: function() {
		var config = this._super();
		config.order = ["name", "kind"];
		config.special.kind = new ChoiceElement({
			label: "Network kind",
			name: "kind",
			choices: createMap(this.editor.networks.all(), "kind", "label"),
			value: this.data.attrs.kind || this.caps.attrs.kind["default"],
			disabled: !this.attrEnabled("kind")
		});
		return config;
	},
	isConnectable: function() {
		return this._super() && !this.busy;
	},
	isRemovable: function() {
		return this._super() && !this.busy;
	},
	isEndpoint: function() {
		return false;
	},
	getConnectTarget: function(callback) {
		return this.topology.createElement({type: "external_network_endpoint", parent: this.data.id}, callback);
	}
});

var createMap = function(listOfObj, keyAttr, valueAttr, startMap) {
	var map = startMap ? copy(startMap) : {};
	for (var i = 0; i < listOfObj.length; i++) 
		map[listOfObj[i][keyAttr]] = typeof valueAttr === "function" ? valueAttr(listOfObj[i]) : listOfObj[i][valueAttr];
	return map;
};

var VMElement = IconElement.extend({
	isConnectable: function() {
		return this._super() && !this.busy;
	},
	isRemovable: function() {
		return this._super() && !this.busy;
	},
	isEndpoint: function() {
		var default_ = true;
		if (this.data && this.data.type == "repy") {
			default_ = false;
			var tmpl = this.getTemplate();
			if (tmpl && tmpl.subtype == "device") default_ = true;
		}
		return (this.data.attrs && this.data.attrs._endpoint != null) ? this.data.attrs._endpoint : default_;
	},
	getTemplate: function() {
		return this.editor.templates.get(this.data.type, this.data.attrs.template);
	},
	configWindowSettings: function() {
		var config = this._super();
		config.order = ["name", "site", "profile", "template", "_endpoint"];
		config.special.template = new TemplateChoiceElement({
			label: "Template",
			name: "template",
			choices: createMap(this.editor.templates.getAll(this.data.type), "name", "label"),
			descriptions: createMap(this.editor.templates.getAll(this.data.type), "name", "description"),
			value: this.data.attrs.template || this.caps.attrs.template["default"],
			disabled: !this.attrEnabled("template")
		});
		config.special.site = new ChoiceElement({
			label: "Site",
			name: "site",
			choices: createMap(this.editor.sites, "name", function(site) {
				return (site.description || site.name) + (site.location ? (", " + site.location) : "");
			}, {"": "Any site"}),
			value: this.data.attrs.site || this.caps.attrs.site["default"],
			disabled: !this.attrEnabled("site")
		});
		config.special.profile = new ChoiceElement({
			label: "Profile",
			name: "profile",
			choices: createMap(this.editor.profiles.getAll(this.data.type), "name", "label"),
			value: this.data.attrs.profile || this.caps.attrs.profile["default"],
			disabled: !this.attrEnabled("profile")
		});
		config.special._endpoint = new ChoiceElement({
			label: "Segment seperation",
			name: "_endpoint",
			choices: {true: "Seperates segments", false: "Connects segments"},
			value: this.isEndpoint(),
			inputConverter: Boolean.parse
		}); 
		return config;
	},
	getConnectTarget: function(callback) {
		return this.topology.createElement({type: this.data.type + "_interface", parent: this.data.id}, callback);
	}
});

var ChildElement = Element.extend({
	getHandlePos: function() {
		var ppos = this.parent.getAbsPos();
		var cpos = this.connection ? this.connection.getCenter() : {x:0, y:0};
		var xd = cpos.x - ppos.x;
		var yd = cpos.y - ppos.y;
		var magSquared = (xd * xd + yd * yd);
		var mag = 14.0 / Math.sqrt(magSquared);
		return {x: ppos.x + (xd * mag), y: ppos.y + (yd * mag)};
	},
	isEndpoint: function() {
		return this.parent.isEndpoint();
	},
	getAbsPos: function() {
		return this.parent.getAbsPos();
	},
	isRemovable: function() {
		return this._super() && !this.busy;
	},
	paint: function() {
		var pos = this.getHandlePos();
		this.circle = this.canvas.circle(pos.x, pos.y, 7).attr({fill: "#CDCDB3"});
		$(this.circle.node).attr("class", "tomato element");
		this.circle.node.obj = this;
		this.enableClick(this.circle);
	},
	paintRemove: function(){
		this.circle.remove();
	},
	paintUpdate: function() {
		var pos = this.getHandlePos();
		this.circle.attr({cx: pos.x, cy: pos.y});
	},
	updateData: function(data) {
		this._super(data);
		if (this.parent && ! this.connection && this.isRemovable()) this.remove();
	}
});

var VMInterfaceElement = ChildElement.extend({
});

var VMConfigurableInterfaceElement = VMInterfaceElement.extend({
	onConnected: function() {
		var hint = this.getAddressHint();
		if (hint == "dhcp") this.modify({"use_dhcp": true});
		else this.modify({"ip4address": "10.0." + hint[0] + "." + hint[1] + "/24"});
	}
});

var SwitchPortElement = ChildElement.extend({
	configWindowSettings: function() {
		var config = this._super();
		config.ignore = ["peers"];
		return config;
	}	
});

var HiddenChildElement = Element.extend({
	getPos: function() {
		return this.parent.getPos();
	},
	getAbsPos: function() {
		return this.parent.getAbsPos();
	}
});

var Template = Class.extend({
	init: function(options) {
		this.type = options.tech;
		this.subtype = options.subtype;
		this.name = options.name;
		this.label = options.label || options.name;
		this.description = options.description || "no description available";
	},
	menuButton: function(options) {
		return Menu.button({
			name: options.name || (this.type + "-" + this.name),
			label: options.label || this.label || (this.type + "-" + this.name),
			icon: "img/"+this.type+((this.subtype&&!options.small)?("_"+this.subtype):"")+(options.small?16:32)+".png",
			toggle: true,
			toggleGroup: options.toggleGroup,
			small: options.small,
			func: options.func
		});
	}
});

var TemplateStore = Class.extend({
	init: function(data) {
		data.sort(function(t1, t2){
			var t = t2.attrs.preference - t1.attrs.preference;
			if (t) return t;
			if (t1.attrs.name < t2.attrs.name) return -1;
			if (t2.attrs.name < t1.attrs.name) return 1;
			return 0;
		});
		this.types = {};
		for (var i=0; i<data.length; i++)
		 if (data[i].type == "template")
		  this.add(new Template(data[i].attrs));
	},
	add: function(tmpl) {
		if (! this.types[tmpl.type]) this.types[tmpl.type] = {};
		this.types[tmpl.type][tmpl.name] = tmpl;
	},
	getAll: function(type) {
		if (! this.types[type]) return [];
		var tmpls = [];
		for (var name in this.types[type]) tmpls.push(this.types[type][name]);
		return tmpls;
	},
	get: function(type, name) {
		if (! this.types[type]) return null;
		return this.types[type][name];
	}
});

var Profile = Class.extend({
	init: function(options) {
		this.type = options.tech;
		this.name = options.name;
		this.label = options.label || options.name;
		this.restricted = options.restricted;
	}
});

var ProfileStore = Class.extend({
	init: function(data) {
		data.sort(function(t1, t2){
			var t = t2.attrs.preference - t1.attrs.preference;
			if (t) return t;
			if (t1.attrs.name < t2.attrs.name) return -1;
			if (t2.attrs.name < t1.attrs.name) return 1;
			return 0;
		});
		this.types = {};
		for (var i=0; i<data.length; i++)
		 if (data[i].type == "profile")
		  this.add(new Profile(data[i].attrs));
	},
	add: function(tmpl) {
		if (! this.types[tmpl.type]) this.types[tmpl.type] = {};
		this.types[tmpl.type][tmpl.name] = tmpl;
	},
	getAll: function(type) {
		if (! this.types[type]) return [];
		var tmpls = [];
		for (var name in this.types[type]) tmpls.push(this.types[type][name]);
		return tmpls;
	},
	get: function(type, name) {
		if (! this.types[type]) return null;
		return this.types[type][name];
	}
});

var NetworkStore = Class.extend({
	init: function(data) {
		data.sort(function(t1, t2){
			var t = t2.attrs.preference - t1.attrs.preference;
			if (t) return t;
			if (t1.attrs.kind < t2.attrs.kind) return -1;
			if (t2.attrs.kind < t1.attrs.kind) return 1;
			return 0;
		});
		this.nets = [];
		for (var i=0; i<data.length; i++)
		 if (data[i].type == "network")
		  this.nets.push(data[i].attrs);
	},
	all: function() {
		return this.nets;
	}
});

var Mode = {
	select: "select",
	connect: "connect",
	connectOnce: "connect_once",
	remove: "remove",
	position: "position"
}

var Editor = Class.extend({
	init: function(options) {
		this.options = options;
		this.options.grid_size = this.options.grid_size || 25;
		this.options.frame_size = this.options.frame_size || this.options.grid_size;
		this.listeners = [];
		this.capabilities = this.options.capabilities;
		this.menu = new Menu(this.options.menu_container);
		this.topology = new Topology(this);
		this.workspace = new Workspace(this.options.workspace_container, this);
		this.sites = this.options.sites;
		this.profiles = new ProfileStore(this.options.resources);
		this.templates = new TemplateStore(this.options.resources);
		this.networks = new NetworkStore(this.options.resources);
		this.buildMenu();
		this.setMode(Mode.select);
		this.supported_configwindow_help_pages = options.supported_configwindow_help_pages || [];
		var t = this;
		this.workspace.setBusy(true);
		ajax ({
			url: "topology/"+options.topology+"/info",
			successFn: function(data){
				t.topology.load(data);
				t.workspace.setBusy(false);
				if ((data.elements.length == 0) && (t.topology.name() == "Topology #"+t.topology.id)) {
					t.topology.initialRenameDialog();
				} else
					if (t.topology.data.attrs._notes_autodisplay)
						t.topology.notesDialog();
			}
		});
	},
	triggerEvent: function(event) {
		log(event);
		for (var i = 0; i < this.listeners.length; i++) this.listeners[i](event);
	},
	setOption: function(name, value) {
		this.options[name] = value;
		this.optionCheckboxes[name].setChecked(value);
		this.onOptionChanged(name);
		this.triggerEvent({component: "editor", object: this, operation: "option", name: name, value: value});
	},
	onOptionChanged: function(name) {
		this.topology.onOptionChanged(name);
		this.workspace.onOptionChanged(name);
	},
	optionMenuItem: function(options) {
		var t = this;
		return Menu.checkbox({
			name: options.name, label: options.label, tooltip: options.tooltip,
			func: function(value){
				t.options[options.name]=value != null;
			  t.onOptionChanged(options.name);
			},
			checked: this.options[options.name]
		});
	},
	onElementConnectTo: function(el) {
		this.setMode(Mode.connectOnce);
		this.connectElement = el;
	},
	onElementSelected: function(el) {
		switch (this.mode) {
			case Mode.connectOnce:
				if (! el.isConnectable()) return;
				this.topology.createConnection(el, this.connectElement);
				this.setMode(Mode.select);
				break;
			case Mode.connect:
				if (! el.isConnectable()) return;
				if (this.connectElement) {
					this.topology.createConnection(el, this.connectElement);
					this.connectElement = null;
				} else this.connectElement = el;
				break;
			case Mode.remove:
				if (! el.isRemovable()) return;
				el.remove();
				break;
			default:
				break;
		}
	},
	onConnectionSelected: function(con) {
		switch (this.mode) {
			case Mode.remove:
				con.remove();
				break;
			default:
				break;
		}
	},
	setMode: function(mode) {
		this.mode = mode;
		this.workspace.onModeChanged(mode);
		if (mode != Mode.position) this.positionElement = null;
		if (mode != Mode.connect && mode != Mode.connectOnce) this.connectElement = null;
		this.triggerEvent({component: "editor", object: this, operation: "mode", mode: this.mode});
	},
	setPositionElement: function(el) {
		this.positionElement = el;
		this.setMode(Mode.position);		
	},
	createPositionElementFunc: function(el) {
		var t = this;
		return function() {
			t.setPositionElement(el);
		}
	},
	createModeFunc: function(mode) {
		var t = this;
		return function() {
			t.setMode(mode);
		}
	},
	createElementFunc: function(el) {
		var t = this;
		return function(pos) {
			var data = copy(el, true);
			data.attrs._pos = pos;
			t.topology.createElement(data);
			t.selectBtn.click();
		}
	},
	createUploadFunc: function(type) {
		var t = this;
		return function(pos) {
			var data = {type: type, attrs: {_pos: pos}};
			t.topology.createElement(data, function(el) {
				el.action("prepare", {callback: function(el){
					el.uploadImage();
				}});
			});
			t.selectBtn.click();
		}
	},
	createTemplateFunc: function(tmpl) {
		return this.createElementFunc({type: tmpl.type, attrs: {template: tmpl.name}});
	},
	buildMenu: function() {
		var t = this;

		var toggleGroup = new ToggleGroup();
	
		var tab = this.menu.addTab("Home");

		var group = tab.addGroup("Modes");
		this.selectBtn = Menu.button({
			label: "Select & Move",
			icon: "img/select32.png",
			toggle: true,
			toggleGroup: toggleGroup,
			small: false,
			checked: true,
			func: this.createModeFunc(Mode.select)
		});
		group.addElement(this.selectBtn);
		group.addStackedElements([
			Menu.button({
				label: "Connect",
				icon: "img/connect16.png",
				toggle: true,
				toggleGroup: toggleGroup,
				small: true,
				func: this.createModeFunc(Mode.connect)
			}),
			Menu.button({
				label: "Delete",
				name: "mode-remove",
				icon: "img/eraser16.png",
				toggle: true,
				toggleGroup: toggleGroup,
				small: true,
				func: this.createModeFunc(Mode.remove)
			})
		]);

		var group = tab.addGroup("Topology control");
		group.addElement(Menu.button({
			label: "Start",
			icon: "img/start32.png",
			toggle: false,
			small: false,
			func: function() {
				t.topology.action_start();
			}
		}));
		group.addElement(Menu.button({
			label: "Stop",
			icon: "img/stop32.png",
			toggle: false,
			small: false,
			func: function() {
				t.topology.action_stop();
			}
		}));
		group.addStackedElements([
			Menu.button({
				label: "Prepare",
				icon: "img/prepare16.png",
				toggle: false,
				small: true,
				func: function() {
					t.topology.action_prepare();
				}
			}),
			Menu.button({
				label: "Destroy",
				icon: "img/destroy16.png",
				toggle: false,
				small: true,
				func: function() {
					t.topology.action_destroy();
				}
			})
		]);
		
		var group = tab.addGroup("Common elements");
		var tmpl = t.templates.get("openvz", "debian-6.0_x86");
		if (tmpl)
		 group.addElement(tmpl.menuButton({
			label: "Debian 6.0 (OpenVZ)",
			toggleGroup: toggleGroup,
			small: false,
			func: this.createPositionElementFunc(this.createTemplateFunc(tmpl))
		}));
		var tmpl = t.templates.get("kvmqm", "debian-6.0_x86");
		if (tmpl)
		 group.addElement(tmpl.menuButton({
			label: "Debian 6.0 (KVM)",
			toggleGroup: toggleGroup,
			small: false,
			func: this.createPositionElementFunc(this.createTemplateFunc(tmpl))
		}));
		group.addElement(Menu.button({
			label: "Switch",
			name: "vpn-switch",
			icon: "img/switch32.png",
			toggle: true,
			toggleGroup: toggleGroup,
			small: false,
			func: this.createPositionElementFunc(this.createElementFunc({
				type: "tinc_vpn",
				attrs: {mode: "switch"}
			}))
		}));
		group.addElement(Menu.button({
			label: "Internet",
			name: "net-internet",
			icon: "img/internet32.png",
			toggle: true,
			toggleGroup: toggleGroup,
			small: false,
			func: this.createPositionElementFunc(this.createElementFunc({
				type: "external_network",
				attrs: {kind: "internet"}
			}))
		}));


		var tab = this.menu.addTab("Devices");

		var group = tab.addGroup("Linux (OpenVZ)");
		var tmpls = t.templates.getAll("openvz");
		var btns = [];
		for (var i=0; i<tmpls.length; i++)
		 btns.push(tmpls[i].menuButton({
			toggleGroup: toggleGroup,
			small: true,
			func: this.createPositionElementFunc(this.createTemplateFunc(tmpls[i]))
		})); 
		group.addStackedElements(btns);

		var group = tab.addGroup("Linux (KVM)");
		var tmpls = t.templates.getAll("kvmqm", "linux");
		var btns = [];
		for (var i=0; i<tmpls.length; i++)
		 if(tmpls[i].subtype == "linux")
		  btns.push(tmpls[i].menuButton({
			toggleGroup: toggleGroup,
			small: true,
			func: this.createPositionElementFunc(this.createTemplateFunc(tmpls[i]))
		})); 
		group.addStackedElements(btns);

		var group = tab.addGroup("Other (KVM)");
		var tmpls = t.templates.getAll("kvmqm");
		var btns = [];
		for (var i=0; i<tmpls.length; i++)
		 if(tmpls[i].subtype != "linux")
		  btns.push(tmpls[i].menuButton({
		  	toggleGroup: toggleGroup,
			small: true,
		  	func: this.createPositionElementFunc(this.createTemplateFunc(tmpls[i]))
		})); 
		group.addStackedElements(btns);

		var group = tab.addGroup("Scripts (Repy)");
		var tmpls = t.templates.getAll("repy");
		var btns = [];
		for (var i=0; i<tmpls.length; i++)
		 if(tmpls[i].subtype == "device")
		  btns.push(tmpls[i].menuButton({
		  	toggleGroup: toggleGroup,
		  	small: true,
		  	func: this.createPositionElementFunc(this.createTemplateFunc(tmpls[i]))
		})); 
		group.addStackedElements(btns);

		var group = tab.addGroup("Upload own images");
		group.addStackedElements([
			Menu.button({
				label: "KVM image",
				name: "kvm-custom",
				icon: "img/kvm16.png",
				toggle: true,
				toggleGroup: toggleGroup,
				small: true,
				func: this.createPositionElementFunc(this.createUploadFunc("kvmqm"))
			}),
			Menu.button({
				label: "OpenVZ image",
				name: "openvz-custom",
				icon: "img/openvz16.png",
				toggle: true,
				toggleGroup: toggleGroup,
				small: true,
				func: this.createPositionElementFunc(this.createUploadFunc("openvz"))
			}),
			Menu.button({
				label: "Repy script",
				name: "repy-custom",
				icon: "img/repy16.png",
				toggle: true,
				toggleGroup: toggleGroup,
				small: true,
				func: this.createPositionElementFunc(this.createUploadFunc("repy"))
			})
		]);


		var tab = this.menu.addTab("Network");

		var group = tab.addGroup("VPN Elements");
		group.addElement(Menu.button({
			label: "Switch",
			name: "vpn-switch",
			icon: "img/switch32.png",
			toggle: true,
			toggleGroup: toggleGroup,
			small: false,
			func: this.createPositionElementFunc(this.createElementFunc({
				type: "tinc_vpn",
				attrs: {mode: "switch"}
			}))
		}));
		group.addElement(Menu.button({
			label: "Hub",
			name: "vpn-hub",
			icon: "img/hub32.png",
			toggle: true,
			toggleGroup: toggleGroup,
			small: false,
			func: this.createPositionElementFunc(this.createElementFunc({
				type: "tinc_vpn",
				attrs: {mode: "hub"}
			}))
		}));

		var group = tab.addGroup("Scripts (Repy)");
		group.addElement(Menu.button({
			label: "Custom script",
			name: "repy-custom",
			icon: "img/repy32.png",
			toggle: true,
			toggleGroup: toggleGroup,
			small: false,
			func: this.createPositionElementFunc(this.createUploadFunc("repy"))
		}));
		var tmpls = t.templates.getAll("repy");
		var btns = [];
		for (var i=0; i<tmpls.length; i++)
		 if(tmpls[i].subtype != "device")
		  btns.push(tmpls[i].menuButton({
		  	toggleGroup: toggleGroup,
		  	small: true,
		  	func: this.createPositionElementFunc(this.createTemplateFunc(tmpls[i]))
		})); 
		group.addStackedElements(btns);

		var group = tab.addGroup("Networks");
		group.addElement(Menu.button({
			label: "Internet",
			name: "net-internet",
			icon: "img/internet32.png",
			toggle: true,
			toggleGroup: toggleGroup,
			small: false,
			func: this.createPositionElementFunc(this.createElementFunc({
				type: "external_network",
				attrs: {kind: "internet"}
			}))
		}));
		group.addElement(Menu.button({
			label: "OpenFlow",
			name: "net-openflow",
			icon: "img/openflow32.png",
			toggle: true,
			toggleGroup: toggleGroup,
			small: false,
			func: this.createPositionElementFunc(this.createElementFunc({
				type: "external_network",
				attrs: {kind: "openflow"}
			}))
		}));


		var tab = this.menu.addTab("Topology");

		var group = tab.addGroup("");
		group.addElement(Menu.button({
			label: "Notes",
			icon: "img/notes32.png",
			toggle: false,
			small: false,
			func: function(){
				t.topology.notesDialog();
			}
		}));
		
		group.addElement(Menu.button({
			label: "Resource usage",
			icon: "img/office-chart-bar.png",
			toggle: false,
			small: false,
			func: function(){
				t.topology.showUsage();
			}
		}));
		group.addStackedElements([
			Menu.button({
				label: "Rename",
				icon: "img/rename.png",
				toggle: false,
				small: true,
				func: function(){
					t.topology.renameDialog();
				}
			}),
			Menu.button({
				label: "Export",
				icon: "img/export16.png",
				toggle: false,
				small: true,
				func: function() {
					window.open(document.URL+ "/export");
				}
			}),
			Menu.button({
				label: "Delete",
				name: "topology-remove",
				icon: "img/cross.png",
				toggle: false,
				small: true,
				func: function() {
					t.topology.remove();
				}
			})
		]);
		group.addElement(Menu.button({
			label: "Users & Permissions",
			icon: "img/user32.png",
			toggle: false,
			small: false,
			func: function() {
				t.workspace.permissionsWindow.createUserPermList();
				t.workspace.permissionsWindow.show();
			}
		}));


		var tab = this.menu.addTab("Options");

		var group = tab.addGroup("Editor");
		this.optionCheckboxes = {
			safe_mode: this.optionMenuItem({
				name:"safe_mode",
   				label:"Safe mode",
   				tooltip:"Asks before all destructive actions"
   			}),
   			snap_to_grid: this.optionMenuItem({
   				name:"snap_to_grid",
   				label:"Snap to grid",
   				tooltip:"All elements snap to an invisible "+this.options.grid_size+" pixel grid"
   			}),
   			fixed_pos: this.optionMenuItem({
		        name:"fixed_pos",
		        label:"Fixed positions",
		        tooltip:"Elements can not be moved"
		    }),

		    colorify_segments: this.optionMenuItem({
		        name:"colorify_segments",
		        label:"Colorify segments",
		        tooltip:"Paint different network segments with different colors"
		    }),
		    
		    debug_mode: this.optionMenuItem({
		        name:"debug_mode",
		        label:"Debug mode",
		        tooltip:"Displays debug messages"
		    })
		};

		group.addStackedElements([this.optionCheckboxes.safe_mode, 
									this.optionCheckboxes.snap_to_grid,
									this.optionCheckboxes.colorify_segments,
									this.optionCheckboxes.fixed_pos,
									this.optionCheckboxes.debug_mode
								]);

		


		this.menu.paint();
	}
});

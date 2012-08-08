#!/bin/bash

HOST=root@fileserver.german-lab.de
DEBS=/root/debian-packages
REPO=/data/files/debian

function upload () {
  PKG=$1
  DISTRO=$2
  for i in $(find $PKG -name *.deb); do
    scp $i $HOST:$DEBS
    ssh $HOST reprepro -b $REPO includedeb $DISTRO $DEBS/$(basename $i)
  done
}

upload hostserver lenny
upload meta lenny
upload meta squeeze
upload repy lenny
upload backend squeeze
upload web squeeze
upload cli squeeze

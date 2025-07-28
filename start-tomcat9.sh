#!/bin/bash

cd /root/Documents/docker-manager/

source venv/bin/activate

python3 change-tomcat-ip.py

systemctl restart tomcat9
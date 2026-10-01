@echo off
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -R 80:localhost:8000 nokey@localhost.run > "D:\naifen-tuntun\tunnel-log.txt" 2>&1

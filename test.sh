#!/usr/bin/env bash

echo "Building and running Quartermaster container"
docker build -t quartermaster-test -f docker/Dockerfile . &>/dev/null
docker run -d --rm -p=8080:80 --name=quartermaster-test quartermaster-test &>/dev/null
status="passed"

echo "Sleeping for 3 seconds to allow the container to start..."
sleep 3

if curl --silent -I http://localhost:8080/index.html | grep -q '200 OK' && curl -I --silent http://localhost:8080/admin.html | grep -q '200 OK'
then
  echo "Test passed, Quartermaster container is serving index.html and admin.html"
else
  echo "Test failed, Quartermaster container is not serving index.html or admin.html"
  status="failed"
fi

echo "Cleaning up Quartermaster container"
docker rm -f quartermaster-test &>/dev/null

# Fail with exit code 1 if the test failed
[[ "${status}" == "failed" ]] && exit 1

exit 0

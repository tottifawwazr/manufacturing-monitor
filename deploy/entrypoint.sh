#!/bin/sh
set -eu
# A newly attached volume can be root-owned. Only this fixed mount directory is
# prepared as root; the ASP.NET process always runs as the image's app user.
if [ "$(id -u)" = "0" ]; then
  install -d -m 0700 -o app -g app /var/lib/mpms
  exec gosu app dotnet /app/ManufacturingMonitor.Api.dll "$@"
fi
exec dotnet /app/ManufacturingMonitor.Api.dll "$@"

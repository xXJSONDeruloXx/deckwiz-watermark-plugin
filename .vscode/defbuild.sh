#!/usr/bin/env bash
CLI_LOCATION="$(pwd)/cli"
printf "Building plugin in $(pwd)\n"
sudo $CLI_LOCATION/decky plugin build $(pwd)

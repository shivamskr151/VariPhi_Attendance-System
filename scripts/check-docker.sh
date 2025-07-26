#!/bin/bash

if ! docker info >/dev/null 2>&1; then
  echo "[ERROR] Docker is not running. Please start Docker Desktop from your Applications folder."
  exit 1
else
  echo "[OK] Docker is running."
fi 
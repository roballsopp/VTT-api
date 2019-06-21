#!/bin/bash -e
cd /var/www/api.vtt-creator.com
git reset --hard
git fetch --tags "https://$USERNAME:$PASSWORD@github.com/roballsopp/vtt-creator-backend.git"
git checkout $TAG
pm2 start app/index.js --name api.vtt-creator.com
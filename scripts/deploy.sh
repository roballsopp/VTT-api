#!/bin/bash -e
cd /var/www/api.vtt-creator.com
git reset --hard
git fetch --tags "https://$USERNAME:$PASSWORD@github.com/roballsopp/vtt-creator-backend.git"
git checkout $TAG
pm2 stop api.vtt-creator.com
pm2 start app --name api.vtt-creator.com --node-args="-r dotenv/config"

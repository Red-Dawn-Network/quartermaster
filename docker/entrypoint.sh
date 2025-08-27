#!/usr/bin/env bash

cat << EOF > /usr/share/nginx/html/config.js
window.RDQM_CONFIG = {
  title: '${INSTANCE_NAME}',
  adminPassword: '${ADMIN_PASSWORD}'
};
EOF
/docker-entrypoint.sh nginx -g "daemon off;"

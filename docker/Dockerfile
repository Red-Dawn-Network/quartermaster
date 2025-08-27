FROM docker.io/nginx:latest

ENV ADMIN_PASSWORD="admin"
ENV INSTANCE_NAME="Quartermaster"

# Clean default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

COPY . /usr/share/nginx/html

COPY docker/entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

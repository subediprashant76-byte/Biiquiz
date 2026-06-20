server {
    listen 80;
    server_name host.biiquiz.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name host.biiquiz.com;

    ssl_certificate /etc/letsencrypt/live/host.biiquiz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/host.biiquiz.com/privkey.pem;

    access_log /var/log/nginx/host.biiquiz.com.access.log;
    error_log /var/log/nginx/host.biiquiz.com.error.log;

    client_max_body_size 25m;

    # Same-origin browser API requests from the frontend.
    # Example: https://host.biiquiz.com/api/auth/register
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 120s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 120s;
    }

    # Frontend pages, static assets, and Next.js routes.
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 120s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 120s;
    }
}

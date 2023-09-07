# From Agora Runner
FROM node:16.9.1-alpine
RUN apk add --no-cache git py-pip alpine-sdk \
    bash autoconf libtool automake

WORKDIR /store-purchase/

ADD . /store-purchase/
RUN npm ci --prefix /store-purchase/ && npm run build --prefix /store-purchase/

# Starts a node process, which compiles TS and watches `src` for changes
ENTRYPOINT [ "/store-purchase/docker/entrypoint.sh" ]

# syntax=docker/dockerfile:1
#
#   docker buildx build --platform linux/amd64 -t ai-gateway:dev --load .

FROM --platform=$BUILDPLATFORM golang:1.27.1-alpine@sha256:8a5910f31396cd4d89662f56c68b3ae31d374308270a1c3bd96672ee5ed43414 AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/ai-gateway .

FROM alpine:3.24.2@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6
RUN apk add --no-cache ca-certificates \
    && addgroup -S -g 10001 app \
    && adduser -S -u 10001 -G app app
COPY --from=build /out/ai-gateway /usr/local/bin/ai-gateway

ENV ADDR=:8080

USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/ai-gateway"]

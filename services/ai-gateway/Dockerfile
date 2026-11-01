# syntax=docker/dockerfile:1
#
#   docker buildx build --platform linux/amd64 -t ai-gateway:dev --load .

FROM --platform=$BUILDPLATFORM golang:1.27.2-alpine@sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/ai-gateway .

FROM alpine:3.24.3@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a
RUN apk add --no-cache ca-certificates \
    && addgroup -S -g 10001 app \
    && adduser -S -u 10001 -G app app
COPY --from=build /out/ai-gateway /usr/local/bin/ai-gateway

ENV ADDR=:8080

USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/ai-gateway"]

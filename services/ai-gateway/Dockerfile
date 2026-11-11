# syntax=docker/dockerfile:1
#
#   docker buildx build --platform linux/amd64 -t ai-gateway:dev --load .

FROM --platform=$BUILDPLATFORM golang:1.27.3-alpine@sha256:d200d2dd76b03a99b52651fd1325aff7dcd35422c35c01bac56571b0507f3deb AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/ai-gateway .

FROM alpine:3.24.4@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf
RUN apk add --no-cache ca-certificates \
    && addgroup -S -g 10001 app \
    && adduser -S -u 10001 -G app app
COPY --from=build /out/ai-gateway /usr/local/bin/ai-gateway

ENV ADDR=:8080

USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/ai-gateway"]

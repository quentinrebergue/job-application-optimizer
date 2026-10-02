# syntax=docker/dockerfile:1
#
# Build with BuildKit so the Go binary is cross-compiled natively:
#   docker buildx build --platform linux/amd64 -t db-migrator:dev --load services/db-migrator

ARG GO_VERSION=1.27
ARG ALPINE_VERSION=3.22

# ---- build: compile the migrator (static binary, migrations embedded) ----
FROM --platform=$BUILDPLATFORM golang:${GO_VERSION}-alpine AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/db-migrator .

# ---- certs: the CA bundle, for databases that require TLS ----
FROM alpine:${ALPINE_VERSION} AS certs
RUN apk add --no-cache ca-certificates

# ---- runtime: the binary and nothing else ----
FROM scratch
COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/db-migrator /db-migrator
USER 10001:10001
ENTRYPOINT ["/db-migrator"]

# syntax=docker/dockerfile:1
#
# Build with BuildKit so the Go binary is cross-compiled natively:
#   docker buildx build --platform linux/amd64 -t db-migrator:dev --load services/db-migrator

# Base images pinned to an exact version and digest (#143): every build uses the
# same bytes. Dependabot opens a PR when a new version is out.

# ---- build: compile the migrator (static binary, migrations embedded) ----
FROM --platform=$BUILDPLATFORM golang:1.27.1-alpine@sha256:8a5910f31396cd4d89662f56c68b3ae31d374308270a1c3bd96672ee5ed43414 AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/db-migrator .

# ---- certs: the CA bundle, for databases that require TLS ----
FROM alpine:3.22.6@sha256:5291449c3df73caf6ed85e649dec1b9e818b39a5d8c871e97afc13e9cd5e8fa8 AS certs
RUN apk add --no-cache ca-certificates

# ---- runtime: the binary and nothing else ----
FROM scratch
COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/db-migrator /db-migrator
USER 10001:10001
ENTRYPOINT ["/db-migrator"]

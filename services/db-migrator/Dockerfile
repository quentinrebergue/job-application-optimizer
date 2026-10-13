# syntax=docker/dockerfile:1
#
# Build with BuildKit so the Go binary is cross-compiled natively:
#   docker buildx build --platform linux/amd64 -t db-migrator:dev --load services/db-migrator

# Base images pinned to an exact version and digest (#143): every build uses the
# same bytes. Dependabot opens a PR when a new version is out.

# ---- build: compile the migrator (static binary, migrations embedded) ----
FROM --platform=$BUILDPLATFORM golang:1.27.2-alpine@sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/db-migrator .

# ---- certs: the CA bundle, for databases that require TLS ----
FROM alpine:3.24.2@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 AS certs
RUN apk add --no-cache ca-certificates

# ---- runtime: the binary and nothing else ----
FROM scratch
COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/db-migrator /db-migrator
USER 10001:10001
ENTRYPOINT ["/db-migrator"]

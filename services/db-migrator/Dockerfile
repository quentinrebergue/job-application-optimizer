# syntax=docker/dockerfile:1
#
# Build with BuildKit so the Go binary is cross-compiled natively:
#   docker buildx build --platform linux/amd64 -t db-migrator:dev --load services/db-migrator

# Base images pinned to an exact version and digest (#143): every build uses the
# same bytes. Dependabot opens a PR when a new version is out.

# ---- build: compile the migrator (static binary, migrations embedded) ----
FROM --platform=$BUILDPLATFORM golang:1.27.3-alpine@sha256:d200d2dd76b03a99b52651fd1325aff7dcd35422c35c01bac56571b0507f3deb AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/db-migrator .

# ---- certs: the CA bundle, for databases that require TLS ----
FROM alpine:3.24.4@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf AS certs
RUN apk add --no-cache ca-certificates

# ---- runtime: the binary and nothing else ----
FROM scratch
COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/db-migrator /db-migrator
USER 10001:10001
ENTRYPOINT ["/db-migrator"]

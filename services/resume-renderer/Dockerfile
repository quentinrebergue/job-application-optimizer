# syntax=docker/dockerfile:1
#
# Build with BuildKit so the Go binary is cross-compiled natively instead of
# being compiled under emulation:
#   docker buildx build --platform linux/amd64 -t resume-renderer:dev --load .

# Base images pinned to an exact version and digest (#143): every build uses the
# same bytes. Dependabot opens a PR when a new version is out.
ARG TYPST_VERSION=0.15.1

# ---- build: compile the Go service (static binary) ----
# Runs on the machine doing the build and cross-compiles for the target.
FROM --platform=$BUILDPLATFORM golang:1.27.3-alpine@sha256:d200d2dd76b03a99b52651fd1325aff7dcd35422c35c01bac56571b0507f3deb AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/resume-renderer .

# ---- typst: download a pinned release and verify its checksum ----
FROM alpine:3.24.4@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf AS typst
ARG TYPST_VERSION
ARG TARGETARCH
ARG TYPST_SHA256_AMD64=a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c
ARG TYPST_SHA256_ARM64=5aa8d74a3d906e60ea12a66ac2f37f8eef1b14cbad7182a745e393a10c23dcee
RUN apk add --no-cache xz \
    && case "${TARGETARCH}" in \
         amd64) arch=x86_64;  sha="${TYPST_SHA256_AMD64}" ;; \
         arm64) arch=aarch64; sha="${TYPST_SHA256_ARM64}" ;; \
         *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
       esac \
    && wget -q -O /tmp/typst.tar.xz \
         "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-${arch}-unknown-linux-musl.tar.xz" \
    && echo "${sha}  /tmp/typst.tar.xz" | sha256sum -c - \
    && tar -xJf /tmp/typst.tar.xz -C /tmp \
    && install -m 0755 "/tmp/typst-${arch}-unknown-linux-musl/typst" /usr/local/bin/typst

# ---- runtime: Alpine + Typst + fonts + the service, nothing else ----
FROM alpine:3.24.4@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf
RUN apk add --no-cache font-liberation \
    && addgroup -S -g 10001 app \
    && adduser -S -u 10001 -G app app
COPY --from=typst /usr/local/bin/typst /usr/local/bin/typst
COPY --from=build /out/resume-renderer /usr/local/bin/resume-renderer

ENV ADDR=:8080 \
    FONT_PATH=/usr/share/fonts/liberation

USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/resume-renderer"]

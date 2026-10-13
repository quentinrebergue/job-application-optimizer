# syntax=docker/dockerfile:1
#
# Build with BuildKit so the Go binary is cross-compiled natively instead of
# being compiled under emulation:
#   docker buildx build --platform linux/amd64 -t password-hasher:dev --load .
#
# The image holds one static binary and nothing else: no shell, no package manager, no libc, no certificates
# (the service makes no outgoing call). That keeps it a few megabytes and leaves nothing to attack or to update.

# Base image pinned to an exact version and digest (#143): every build uses the same bytes.
# ---- build: compile the Go service (static binary) ----
# Runs on the machine doing the build and cross-compiles for the target.
FROM --platform=$BUILDPLATFORM golang:1.27.2-alpine@sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# -s -w drop the symbol table and the debug info; -trimpath drops the build paths. The service has no cgo.
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/password-hasher .

# ---- runtime: the binary alone ----
FROM scratch
COPY --from=build /out/password-hasher /password-hasher

# GOMEMLIMIT makes the garbage collector work harder as the process nears it, so the container stays small
# (a hash needs only a few kilobytes: what is kept is the Go runtime and the connections).
ENV ADDR=:8080 \
    GOMEMLIMIT=24MiB

# A number, not a name: there is no /etc/passwd in this image.
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/password-hasher"]

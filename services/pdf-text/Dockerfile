# syntax=docker/dockerfile:1
#
# Build with BuildKit so the Go binary is cross-compiled natively instead of
# being compiled under emulation:
#   docker buildx build --platform linux/amd64 -t pdf-text:dev --load .
#
# The image holds one static binary and nothing else: no shell, no package manager, no libc, no certificates (the service makes
# no outgoing call). pdfium is inside the binary as WebAssembly, run by wazero: no C library to install, and the reader of
# the PDFs sits in the memory sandbox of WebAssembly, inside a container with no network.

# Base image pinned to an exact version and digest (#143): every build uses the same bytes.
# ---- build: compile the Go service (static binary) ----
# Runs on the machine doing the build and cross-compiles for the target.
FROM --platform=$BUILDPLATFORM golang:1.27.3-alpine@sha256:d200d2dd76b03a99b52651fd1325aff7dcd35422c35c01bac56571b0507f3deb AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# -s -w drop the symbol table and the debug info; -trimpath drops the build paths. The service has no cgo.
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/pdf-text .

# ---- runtime: the binary alone ----
FROM scratch
COPY --from=build /out/pdf-text /pdf-text

# Compiling the module of pdfium takes 200 to 235 MB for a moment, whatever GOMEMLIMIT says (measured in a container: the
# compiler of wazero allocates outside the heap of Go), then the process falls to about 40 MB. So the pod needs a memory limit of
# 384 Mi to start, 256 Mi is not enough (a limit is not a reservation: the service stays at about 48 MiB), and CACHE_DIR, a folder kept between two
# starts of the container (an emptyDir in the pod): with the compiled module in it a start takes about 80 ms and about 47 MB, and
# fits under 128 MB. smoke.sh proves both in the CI. GOMEMLIMIT keeps the heap tight once the service is working.
ENV ADDR=:8080 \
    GOMEMLIMIT=64MiB

# A number, not a name: there is no /etc/passwd in this image.
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/pdf-text"]

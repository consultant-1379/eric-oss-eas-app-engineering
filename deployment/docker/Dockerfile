FROM armdocker.rnd.ericsson.se/proj-eric-oss-dev/oss-testware/eric-oss-eas-testware-k6-base:1.0.0

FROM armdocker.rnd.ericsson.se/proj-eric-oss-drop/k6/tooling/k6-base-image:latest

COPY --from=0 /go/src/go.k6.io/xk6/k6 /usr/local/bin/k6

ARG version

ENV TEST_VERSION=$version

ENV STAGING_TYPE="APPLICATION"
ENV APP_NAME="eric-oss-ericsson-adaptation"
ENV ADDITIONAL_ARGS="--insecure-skip-tls-verify --quiet"
ENV PRINT_K6_OUTPUT="true"

ADD js/ /tests
ADD resources/ /resources
ADD enm_certs/ /enm_certs

#!/bin/bash

if [ $# -lt 3 ]
then
  echo "Wrong parameters. Usage: ./cacert.sh <kubeconfig> <namespace> <enm_url>"
  exit 1
fi

GENERATE_ENABLED=false
LOCAL_RUN=false

KUBECONFIG=$1
NAMESPACE=$2
ENM_URL=$3

USERNAME="gas-user"
PASSWORD='Ericsson123!'

CERTM_URL=""
SESSIONID="kiskutya"

if [ "$LOCAL_RUN" = true ] ; then
  kubectl --kubeconfig $KUBECONFIG -n $NAMESPACE port-forward deployment/eric-sec-certm 5003:5003 &
  sleep 5
  CERTM_URL="http://localhost:5003"
else
  HELM_ENV_VAL=`helm get values eric-oss-common-base --kubeconfig $KUBECONFIG -n $NAMESPACE -o json`
  GAS_HOST=`echo $HELM_ENV_VAL | python3 -c "import sys, json; print(json.load(sys.stdin)['global']['hosts']['gas'])"`
  USERNAME=`echo $HELM_ENV_VAL | python3 -c "import sys, json; print(json.load(sys.stdin)['gas']['defaultUser']['username'])"`
  PASSWORD=`echo $HELM_ENV_VAL | python3 -c "import sys, json; print(json.load(sys.stdin)['gas']['defaultUser']['password'])"`
  SESSIONID=$(curl -s -k -X POST "https://$GAS_HOST/auth/v1" -H "X-Login: $USERNAME" -H "X-password: $PASSWORD")

  CERTM_URL="https://$GAS_HOST"

  USER_GET_ROLES_RESPONSE=$(curl -s -k -X GET "https://$GAS_HOST/idm/usermgmt/v1/users/$USERNAME?tenantname=master" --cookie "JSESSIONID=$SESSIONID")

  if [[ "$USER_GET_ROLES_RESPONSE" != *"System_SecurityAdministrator"* ]]; then
    USERS_PUT_ROLES_REQUEST_BODY="{"$(echo $USER_GET_ROLES_RESPONSE | cut -c 46-)
    USERS_PUT_ROLES_REQUEST_BODY="${USERS_PUT_ROLES_REQUEST_BODY/"]}"/,\"System_SecurityAdministrator\"]}}"

    USER_PUT_ROLES_RESPONSE=$(curl -s -k -X PUT -H "Content-Type: application/json" "https://$GAS_HOST/idm/usermgmt/v1/users/$USERNAME?tenantname=master" --data "$USERS_PUT_ROLES_REQUEST_BODY" --cookie "JSESSIONID=$SESSIONID")

    if [[ "$USER_PUT_ROLES_RESPONSE" != *"System_SecurityAdministrator"* ]]; then
      echo -e "$USER_PUT_ROLES_RESPONSE\n"
      exit 1
    else
      echo -e "$USER_PUT_ROLES_RESPONSE\n"
    fi

    curl -s -k -X GET "https://$GAS_HOST/logout" --cookie "JSESSIONID=$SESSIONID"

    sleep 5

    SESSIONID=$(curl -s -k -X POST "https://$GAS_HOST/auth/v1" -H "X-Login: $USERNAME" -H "X-password: $PASSWORD")
  else
     echo -e "User already had System_SecurityAdministrator role\n"
  fi
fi

CACERT_GET_RESPONSE=$(curl -s -k -X GET -H "Accept: application/json" "$CERTM_URL/certm/nbi/v2/trusted-certificates/enm-http-client" --cookie "JSESSIONID=$SESSIONID")

NUM_OF_CERTS=$(echo -n "$CACERT_GET_RESPONSE" | grep -Fo "ca-certificate-" | wc -l)
NUM_OF_CERTS=$(($NUM_OF_CERTS+1))

CUSTOM_ENM_CERT="\n"
if [ "$GENERATE_ENABLED" = true ] ; then
  NEW_ENM_CERT=$(openssl s_client -showcerts -connect $ENM_URL:443 </dev/null 2>/dev/null | openssl x509)
  CUSTOM_ENM_CERT=$(echo "$NEW_ENM_CERT" | sed ':a;N;$!ba;s/\n/\\n/g')$CUSTOM_ENM_CERT
else
  FILE="$PWD/scripts/enm_certs/$ENM_URL.txt"
  if [ -f "$FILE" ]; then
      CUSTOM_ENM_CERT=$(sed ':a;N;$!ba;s/\n/\\n/g' $FILE)$CUSTOM_ENM_CERT
  else
      echo "Cert generation is disabled and $FILE does not exist."
  fi
fi

CACERT_PUT_REQUEST_BODY="${CACERT_GET_RESPONSE/"{\"name\":\"enm-http-client\",\""/"{"}"
CACERT_PUT_REQUEST_BODY="${CACERT_PUT_REQUEST_BODY/"\"}]}"/"},{\"name\":\"ca-certificate-$NUM_OF_CERTS\",\"certificate\":\"$CUSTOM_ENM_CERT\"}]}"}"

echo "${CACERT_PUT_REQUEST_BODY:1: -1}" > cacert_fasza.json

CACERT_PUT_RESPONSE=$(curl -k -X PUT -H "Content-Type: application/json" "$CERTM_URL/certm/nbi/v2/trusted-certificates/enm-http-client" --data "$(cat cacert_fasza.json)" --cookie "JSESSIONID=$SESSIONID")

if [[ "$CACERT_PUT_RESPONSE" != *"Replaced trusted-certificates 'enm-http-client'"* ]]; then
  echo -e "$CACERT_PUT_RESPONSE\n"
  exit 1
else
  echo -e "$CACERT_PUT_RESPONSE\n"
fi

NUMPODS=(`kubectl --kubeconfig $KUBECONFIG get pods -n $NAMESPACE | grep eric-eo-enm-adapter | wc -l`)

SERVICE_PODS=$(kubectl --kubeconfig $KUBECONFIG get pods -n $NAMESPACE | grep eric-eo-enm-adapter)

for (( c=1; c<=$NUMPODS; c++ ))
do
  POD=(`echo "$SERVICE_PODS" | awk -v line=$c  -F ' ' 'NR==line{printf $1}'`)
  kubectl --kubeconfig $KUBECONFIG delete pod $POD -n $NAMESPACE
done

NUMPODS=(`kubectl --kubeconfig $KUBECONFIG get pods -n $NAMESPACE | grep eric-oss-enm-notification-adapter | grep -v database | wc -l`)

SERVICE_PODS=$(kubectl --kubeconfig $KUBECONFIG get pods -n $NAMESPACE | grep eric-oss-enm-notification-adapter)

for (( c=1; c<=$NUMPODS; c++ ))
do
  POD=(`echo "$SERVICE_PODS" | grep -v database | awk -v line=$c  -F ' ' 'NR==line{printf $1}'`)
  kubectl --kubeconfig $KUBECONFIG delete pod $POD -n $NAMESPACE
done

if [ "$LOCAL_RUN" = true ] ; then
  pkill -f port-forward
fi
#
# COPYRIGHT Ericsson 2024
#
#
#
# The copyright to the computer program(s) herein is the property of
#
# Ericsson Inc. The programs may be used and/or copied only with written
#
# permission from Ericsson Inc. or in accordance with the terms and
#
# conditions stipulated in the agreement/contract under which the
#
# program(s) have been supplied.
#

import sys
import json
import subprocess
import requests
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

kubeconfig = sys.argv[1]
namespace = sys.argv[2]
enmhost = sys.argv[3]

gasuser = 'gas-user'
gaspassword = 'Ericsson123!'
sessionid = ''

chvalues = subprocess.check_output(["helm", "get", "values", "eric-oss-config-handling", "--kubeconfig", kubeconfig, "-n", namespace, "-o", "json"])
chvaluesjson = json.loads(chvalues)
gashost = chvaluesjson['global']['hosts']['gas']
print(gashost)
gashost = 'http://localhost:45454'

gasauth = gashost + '/auth/v1'

headers = {'X-Login': gasuser, 'X-password': gaspassword}

httprequest = Request(gasauth, method='POST', headers=headers)

with urlopen(httprequest) as response:
    sessionid = response.read().decode()

#print(sessionid)

gasuserurl = gashost + '/idm/usermgmt/v1/users/' + gasuser + '?tenantname=master'

headers = {'Cookie': 'JSESSIONID=' + sessionid}

httprequest = Request(gasuserurl, method='GET', headers=headers)

with urlopen(httprequest) as response:
    gasuserroles = response.read().decode()

#print(gasuserroles)

gasuserrolesjson = json.loads(gasuserroles)
roles = gasuserrolesjson['privileges']

#print(roles)

if 'System_SecurityAdministrator' not in roles:
    gasuserrolesjson['privileges'].append('System_SecurityAdministrator')

    postdata = json.dumps(gasuserrolesjson).encode()

    #print(postdata)

    headers = {'Cookie': 'JSESSIONID=' + sessionid, 'Content-Type': 'application/json; charset=UTF-8'}

    httprequest = Request(gasuserurl, data=postdata, method='PUT', headers=headers)

    with urlopen(httprequest) as response:
        gasuserroles = response.read().decode()
else:
    print(gasuser +' already has System_SecurityAdministrator role')

# gaslogout = gashost + '/logout'
#
# headers = {'Cookie': 'JSESSIONID=' + sessionid}
#
# httprequest = Request(gaslogout, method='GET', headers=headers)
#
# with urlopen(httprequest) as response:
#     logout = response.read().decode()
#
# time.sleep(5)

gasauth = gashost + '/auth/v1'

headers = {'X-Login': gasuser, 'X-password': gaspassword}

httprequest = Request(gasauth, method='POST', headers=headers)

with urlopen(httprequest) as response:
    sessionid = response.read().decode()

#print(sessionid)

certmurl = gashost + '/certm/nbi/v2/trusted-certificates/enm-http-client'

headers = {'Cookie': 'JSESSIONID=' + sessionid}

httprequest = Request(certmurl, method='GET', headers=headers)

with urlopen(httprequest) as response:
    certs = response.read().decode()

#print(certs)

try:
    with open('enm_certs/' + enmhost + '.txt', 'r') as f:
        input = f.read()
except IOError:
    print("Could not open file:", f)
    sys.exit(errno.EACCES)

certsjson = json.loads(certs)
actualcerts = certsjson['certificates']

actualcerts.append({'name': 'ca-certificate-' + str((len(actualcerts) + 1)), 'certificate' : input + '\n'})

#print(actualcerts)

certificates = {
    'certificates': {}
}
certificates['certificates'] = actualcerts

postdata = json.dumps(certificates)

#print(postdata)

headers = {'Cookie': 'JSESSIONID=' + sessionid, 'Content-Type': 'application/json; charset=UTF-8'}

httprequest = Request(certmurl, data=bytes(postdata.encode("utf-8")), method='PUT', headers=headers)

with urlopen(httprequest) as response:
    certresult = response.read().decode()

print(certresult)

subprocess.run(["kubectl", "rollout", "restart", "--kubeconfig", kubeconfig, "-n", namespace, "deployment", "eric-eo-enm-adapter"])
subprocess.run(["kubectl", "rollout", "restart", "--kubeconfig", kubeconfig, "-n", namespace, "deployment", "eric-oss-enm-notification-adapter"])

subprocess.run(["kubectl", "rollout", "status", "--kubeconfig", kubeconfig, "-n", namespace, "deployment", "eric-eo-enm-adapter"])
subprocess.run(["kubectl", "rollout", "status", "--kubeconfig", kubeconfig, "-n", namespace, "deployment", "eric-oss-enm-notification-adapter"])

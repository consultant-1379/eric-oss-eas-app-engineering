import sys
from kubernetes import client, config

KUBE_CONF = sys.argv[1]
NAMESPACE = sys.argv[2]
FILE_NAME = sys.argv[3]

config.load_kube_config(KUBE_CONF)
v1 = client.CoreV1Api()

pods = v1.list_namespaced_pod(NAMESPACE, watch=False)

for pod in pods.items:
    print(
        f'{pod.metadata.name} {pod.status.container_statuses[0].restart_count}')
try:
    with open(FILE_NAME, 'w') as f:
        for pod in pods.items:
            f.write(
                f'{pod.metadata.name}: {pod.status.container_statuses[0].restart_count}\n')
except IOError:
    print("Could not open files")
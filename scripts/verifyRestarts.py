import sys

RESTART_BEFORE_TEST = sys.argv[1]
RESTART_AFTER_TEST = sys.argv[2]

try:
    with open(RESTART_BEFORE_TEST, 'r') as f1:
        with open(RESTART_AFTER_TEST, 'r') as f2:
            contents = f1.read()
            contents_new = f2.read()
except IOError:
    print("Could not open files")
    sys.exit(-1)

lines = contents.split('\n')
lines_new = contents_new.split('\n')

restarts_before_test = {}
restarts_after_test = {}
for line in lines:
    if len(line.strip()) != 0:
        name, count = line.split(':')
        restarts_before_test[name] = count
for line_new in lines_new:
    if len(line_new.strip()) != 0:
        name, count = line_new.split(':')
        restarts_after_test[name] = count

restarted_pods = []
for name, count in restarts_after_test.items():
    before_count = restarts_before_test.get(name)
    if before_count is not None:
        if restarts_before_test[name] != count:
            restarted_pods.append(name)

print(f'The following pods restarded during the test {restarted_pods}')
if len(restarted_pods) != 0:
    for pod in restarted_pods:
        if 'eric-cloud-native-kvdb-rd-operand' not in pod and 'eric-pm-server-0' not in pod and 'eric-eo-enm-stub' not in pod:
            sys.exit(-1)

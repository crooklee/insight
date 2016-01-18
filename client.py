import requests
import sys
import json
import base64
if len(sys.argv) < 2:
    exit("usage:\n  python client.py xx.png yy.png zz.png")
name1 = sys.argv[1]
name2 = sys.argv[2]
name3 = sys.argv[3]
try:
    f1 = open(name1)
    data1 = base64.b64encode(f1.read())
    f2 = open(name2)
    data2 = base64.b64encode(f2.read())
    f3 = open(name3)
    data3 = base64.b64encode(f3.read())
except:
    data1 = None
    data2 = None
    data3 = None
payload1 = {"location_id": 1, "event_factor": 10,
            "event_type": 1, "snapshot": data1}
payload2 = {"location_id": 1, "event_factor": 10,
            "event_type": 4, "snapshot": data2}
payload3 = {"location_id": 1, "event_factor": 10,
            "event_type": 5, "snapshot": data3}


try:
    requests.post("http://127.0.0.1:8888/api", data=json.dumps(payload1))
    requests.post("http://127.0.0.1:8888/api", data=json.dumps(payload2))
    requests.post("http://127.0.0.1:8888/api", data=json.dumps(payload3))


except:
    print "Post request error!"

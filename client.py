import requests
import sys
import json
import base64
if len(sys.argv) < 4:
    exit("usage:\n  python client.py xx.png yy.png zz.png aa.png bb.png")
name1 = sys.argv[1]
name2 = sys.argv[2]
name3 = sys.argv[3]
name4 = sys.argv[4]
name5 = sys.argv[5]
try:
    f1 = open(name1)
    data1 = base64.b64encode(f1.read())
    f2 = open(name2)
    data2 = base64.b64encode(f2.read())
    f3 = open(name3)
    data3 = base64.b64encode(f3.read())
    f4 = open(name4)
    data4 = base64.b64encode(f4.read())
    f5 = open(name5)
    data5 = base64.b64encode(f5.read())
except:
    data1 = None
    data2 = None
    data3 = None
    data4 = None
    data5 = None
payload1 = {"location_id": 1, "event_factor": 90,
            "event_type": 1, "snapshot": data1}
payload2 = {"location_id": 1, "event_factor": 10,
            "event_type": 2, "snapshot": data2}
payload3 = {"location_id": 2, "event_factor": 10,
            "event_type": 3, "snapshot": data3}
payload4 = {"location_id": 3, "event_factor": 10,
            "event_type": 4, "snapshot": data4}
payload5 = {"location_id": 4, "event_factor": 10,
            "event_type": 5, "snapshot": data5}


try:
    requests.post("http://127.0.0.1:8888/api", data=json.dumps(payload1))
    requests.post("http://127.0.0.1:8888/api", data=json.dumps(payload2))
    requests.post("http://127.0.0.1:8888/api", data=json.dumps(payload3))
    requests.post("http://127.0.0.1:8888/api", data=json.dumps(payload4))
    requests.post("http://127.0.0.1:8888/api", data=json.dumps(payload5))

except:
    print "Post request error!"

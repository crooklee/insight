import base64
import sys
name = sys.argv[1]
f = open(name)
data = base64.b64encode(f.read())
print data

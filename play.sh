j=200
for((1;1;1));do
for (( i=1; i<10; i++)); do  
echo $j
if [ $j == 200 ]
then j=500;
else j=200;
fi
curl "http://127.0.0.1:8888/api?id="$i"&value="$j 
sleep 1
done
done 

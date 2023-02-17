# k6_xiangqi

Steps to start the server
1. After cloning open the folder in terminal.
2. Change directory to storage_api using ```cd storage_api```.
3. Create virtual environment using ```virtualenv venv```. (This step assumes that Python3 and virtualenv is installed on the system)
4. Activate the virtual environment: Mac Users ```source venv/bin/activate```
5. Install flask using Pip3.
6. Start the Server using ```FLASK_APP=app.py flask run```

To run k6 scrip:
1. Open the folder in terminal.
2. Run this command: ```k6 run create_games.js```.

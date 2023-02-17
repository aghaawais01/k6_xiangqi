from flask import Flask, request

app = Flask(__name__)
FILENAME = 'data.txt'


@app.route('/data', methods=['POST'])
def add_data():
    data = request.get_data().decode()
    with open(FILENAME, 'a') as f:
        f.write(data + '\n')
    return 'Data added successfully'


@app.route('/data', methods=['GET'])
def get_data():
    with open(FILENAME, 'r') as f:
        lines = f.readlines()
        if lines:
            first_line = lines[0]
            lines = lines[1:]
            with open(FILENAME, 'w') as f:
                f.writelines(lines)
            return first_line
        else:
            return 'No data available'


@app.route('/clear', methods=['POST'])
def clear_data():
    with open(FILENAME, 'w'):
        pass
    return 'Data cleared successfully'


if __name__ == '__main__':
    app.run()

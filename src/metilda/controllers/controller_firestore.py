from flask import jsonify, request, Response

from metilda import app
from .Postgres import Postgres


@app.route('/api/collections', methods=["GET", "POST"])
def getOrCreate_Collections():
    req_method = request.method

    if req_method == "GET":
        with Postgres() as connection:
            postgres_select_query = """ SELECT * FROM COLLECTIONS """
            filter_values=()
            results = connection.execute_select_query(postgres_select_query,(filter_values,))
            print(results)
        return jsonify({'result': results})

    elif req_method == "POST":
        with Postgres() as connection:
            
            postgres_insert_query = """ INSERT INTO collections (COLLECTION_ID, COLLECTION_NAME, OWNER_ID, CREATED_AT, COLLECTION_DESCRIPTION) VALUES (DEFAULT, %s, %s, CURRENT_TIMESTAMP, %s) RETURNING COLLECTION_ID """
            record_to_insert = (request.form['collection_name'],request.form['owner_id'],request.form['collection_description']  )
            last_row_id = connection.execute_insert_query(postgres_insert_query, record_to_insert)
        
        # if query does not return last_row_id return error
        if last_row_id is None:
            return Response("{'result': 'query unsuccessful'}", status=500, mimetype='application/json')
        else:
            return jsonify({'result': last_row_id})

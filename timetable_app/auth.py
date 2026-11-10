from flask import Blueprint, request, jsonify
from .models import Admin, db

auth = Blueprint('auth', __name__)

@auth.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    name = data.get('name')
    password = data.get('password')

    if not all([email, name, password]):
        return jsonify({"message": "Missing required data"}), 400

    if Admin.query.filter_by(email=email).first():
        return jsonify({"message": "Email address already registered"}), 409

    new_admin = Admin(
        email=email,
        name=name
    )
    new_admin.set_password(password)
    
    db.session.add(new_admin)
    db.session.commit()

    return jsonify({"message": "Signup successful! You can now log in."}), 201

@auth.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    admin = Admin.query.filter_by(email=email).first()

    if not admin or not admin.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    return jsonify({"message": "Login successful!", "name": admin.name}), 200
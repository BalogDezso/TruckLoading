import os
from flask import Flask, render_template, request, jsonify
import itertools

app = Flask(__name__)

MAX_TRUCK = (20, 5, 5)  # hossz, szélesség, magasság


def fits(x, y, z, size, placed, truck):
    L, W, H = size
    tL, tW, tH = truck
    if x + L > tL or y + W > tW or z + H > tH:
        return False
    for p in placed:
        px, py, pz = p["x"], p["y"], p["z"]
        pL, pW, pH = p["size"]
        if (x < px + pL and x + L > px and
                y < py + pW and y + W > py and
                z < pz + pH and z + H > pz):
            return False
    return True


def place_items(truck, items):
    tL, tW, tH = truck
    placed = []
    step = 0.5
    for item in items:
        L, W, H = item["size"]
        color = item["color"]
        rotations = [(L, W, H), (L, H, W), (W, L, H), (W, H, L), (H, L, W), (H, W, L)]
        placed_flag = False
        z = 0
        while z < tH:
            y = 0
            while y < tW:
                x = 0
                while x < tL:
                    for r in rotations:
                        if fits(x, y, z, r, placed, truck):
                            placed.append({"x": x, "y": y, "z": z, "size": list(r), "color": color})
                            placed_flag = True
                            break
                    if placed_flag: break
                    x += step
                if placed_flag: break
                y += step
            if placed_flag: break
            z += step
        if not placed_flag: return None
    return placed


def calculate_logic(truck, cargos):
    tL = min(truck[0], MAX_TRUCK[0])
    tW = min(truck[1], MAX_TRUCK[1])
    tH = min(truck[2], MAX_TRUCK[2])
    truck = (tL, tW, tH)
    items = []
    for c in cargos:
        L, W, H = c["size"]
        for _ in range(c["count"]):
            items.append({"size": [L, W, H], "color": c["color"]})
    items.sort(key=lambda x: x["size"][0] * x["size"][1] * x["size"][2], reverse=True)

    MAX_TRIES = 10  # Csökkentve a Render sebessége miatt
    for i in range(MAX_TRIES):
        attempt = items.copy()
        placed = place_items(truck, attempt)
        if placed: return placed, []

    placed = place_items(truck, items)
    if not placed:
        placed, not_loaded = [], []
        for item in items:
            res = place_items(truck, placed + [item])
            if res:
                placed = res
            else:
                not_loaded.append({"color": item["color"], "missing": 1})
        return placed, not_loaded
    return placed, []


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/calculate", methods=["POST"])
def calc():
    data = request.json
    truck = data["truck"]
    cargos = data["cargo"]
    placed, not_loaded = calculate_logic(truck, cargos)
    return jsonify({"positions": placed, "not_loaded": not_loaded})


if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
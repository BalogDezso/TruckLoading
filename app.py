import os
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


# Segédfüggvény az ütközésvizsgálathoz
def fits(x, y, z, size, placed, truck):
    L, W, H = size
    tL, tW, tH = truck
    # 0.01 tolerancia a lebegőpontos számítási hibák ellen
    if x + L > tL + 0.01 or y + W > tW + 0.01 or z + H > tH + 0.01:
        return False
    for p in placed:
        px, py, pz = p["x"], p["y"], p["z"]
        pL, pW, pH = p["size"]
        if (x < px + pL - 0.01 and x + L > px + 0.01 and
                y < py + pW - 0.01 and y + W > py + 0.01 and
                z < pz + pH - 0.01 and z + H > pz + 0.01):
            return False
    return True


# A pakoló algoritmus sarokpontos módszerrel
def place_items(truck, items, strategy="width_first"):
    tL, tW, tH = truck
    placed = []

    for item in items:
        L, W, H = item["size"]
        color = item["color"]

        # Rotációk sorrendje a stratégia alapján
        if strategy == "width_first":
            rotations = [(W, L, H), (L, W, H)]
        else:
            rotations = [(L, W, H), (W, L, H)]

        if L == W: rotations = [(L, W, H)]

        found = False
        # Sarokpontok kigyűjtése (ahová egy új tárgyat tehetünk)
        px = sorted(list(set([0] + [p["x"] + p["size"][0] for p in placed])))
        py = sorted(list(set([0] + [p["y"] + p["size"][1] for p in placed])))
        pz = sorted(list(set([0] + [p["z"] + p["size"][2] for p in placed])))

        # Próbálkozás minden lehetséges helyen
        for z in pz:
            for x in px:
                for y in py:
                    for r in rotations:
                        if fits(x, y, z, r, placed, truck):
                            placed.append({"x": x, "y": y, "z": z, "size": list(r), "color": color})
                            found = True
                            break
                    if found: break
                if found: break
            if found: break

    return placed




@app.route("/calculate", methods=["POST"])
def calc():
    data = request.json
    truck = [float(x) for x in data["truck"]]
    cargos = data["cargo"]

    all_items = []
    for c in cargos:
        for _ in range(int(c["count"])):
            all_items.append({"size": [float(x) for x in c["size"]], "color": c["color"]})

    # Két különböző megközelítést próbálunk ki, és a jobbat tartjuk meg
    res1 = place_items(truck, all_items, "width_first")
    res2 = place_items(truck, all_items, "length_first")

    best_placed = res1 if len(res1) >= len(res2) else res2

    # Kiszámoljuk, mi maradt ki (szín alapján)
    total_requested = {}
    for item in all_items:
        color = item["color"]
        total_requested[color] = total_requested.get(color, 0) + 1

    for p in best_placed:
        color = p["color"]
        total_requested[color] -= 1

    not_loaded = []
    for col, count in total_requested.items():
        if count > 0:
            not_loaded.append({"color": col, "missing": count})

    return jsonify({"positions": best_placed, "not_loaded": not_loaded})


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
let scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

let camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(500, 500);
document.getElementById("viewer").appendChild(renderer.domElement);

let controls = new THREE.OrbitControls(camera, renderer.domElement);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

function clearScene() {
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
}

function drawTruck(size) {
    let [L, W, H] = size;
    const geo = new THREE.BoxGeometry(L, H, W);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    const truck = new THREE.Mesh(geo, mat);
    truck.position.set(L / 2, H / 2, W / 2);
    scene.add(truck);

    // Kamera pozícionálása a teherautó méretéhez
    const maxDim = Math.max(L, W, H);
    camera.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5);
    camera.lookAt(L / 2, H / 2, W / 2);
    controls.target.set(L / 2, H / 2, W / 2);
}

function drawCargo(cargos) {
    cargos.forEach(c => {
        const geo = new THREE.BoxGeometry(c.size[0], c.size[2], c.size[1]);
        const mat = new THREE.MeshBasicMaterial({ color: c.color });
        const cube = new THREE.Mesh(geo, mat);
        // Three.js-ben az Y a felfelé mutató tengely, ezért c.z megy oda
        cube.position.set(c.x + c.size[0] / 2, c.z + c.size[2] / 2, c.y + c.size[1] / 2);
        scene.add(cube);

        // Fekete körvonal
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
        line.position.copy(cube.position);
        scene.add(line);
    });
}

function showNotLoaded(list) {
    let container = document.getElementById("notloaded");
    // Teljesen kiürítjük a konténert az elején!
    container.innerHTML = "";

    if (!list || list.length === 0) {
        container.innerHTML = "<span style='color:green; font-weight:bold;'>Minden befért!</span>";
        return;
    }

    let html = "<b class='text-red-600'>Nem fért be:</b><br>";
    list.forEach(c => {
        html += `<div class="flex items-center gap-2 font-semibold">
                    <span style="color:${c.color}; font-size:20px;">■</span> ${c.missing} db
                 </div>`;
    });
    container.innerHTML = html;
}

function addCargo() {
    let html = `
    <div class="border p-2 mt-2 flex gap-1 items-center bg-gray-50 rounded">
        <input placeholder="H" class="border p-1 cargoL w-12" title="Hossz">
        <input placeholder="SZ" class="border p-1 cargoW w-12" title="Szélesség">
        <input placeholder="M" class="border p-1 cargoH w-12" title="Magasság">
        <input placeholder="Db" class="border p-1 cargoC w-12" title="Darabszám">
        <input type="color" class="cargoColor" value="#3b82f6">
        <button onclick="this.parentElement.remove()" class="bg-red-500 text-white px-2 rounded">X</button>
    </div>`;
    document.getElementById("cargoList").insertAdjacentHTML("beforeend", html);
}

async function calculate() {
    const tL = document.getElementById("tL").value;
    const tW = document.getElementById("tW").value;
    const tH = document.getElementById("tH").value;

    if(!tL || !tW || !tH) {
        alert("Kérlek add meg a teherautó méreteit!");
        return;
    }

    let cargos = [];
    document.querySelectorAll("#cargoList > div").forEach(div => {
        cargos.push({
            size: [div.querySelector(".cargoL").value, div.querySelector(".cargoW").value, div.querySelector(".cargoH").value],
            count: div.querySelector(".cargoC").value,
            color: div.querySelector(".cargoColor").value
        });
    });

    try {
        let res = await fetch("/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ truck: [tL, tW, tH], cargo: cargos })
        });
        let data = await res.json();

        clearScene();
        drawTruck([Number(tL), Number(tW), Number(tH)]);
        drawCargo(data.positions);
        showNotLoaded(data.not_loaded);
    } catch (e) {
        console.error("Hiba a számítás során:", e);
    }
}
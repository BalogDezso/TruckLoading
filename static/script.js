let scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

let camera = new THREE.PerspectiveCamera(
75,
500/500,
0.1,
1000
)

let renderer = new THREE.WebGLRenderer({antialias:true})
renderer.setSize(500,500)

document.getElementById("viewer").appendChild(renderer.domElement)

camera.position.set(10,10,10)
camera.lookAt(0,0,0)

let controls = new THREE.OrbitControls(camera, renderer.domElement)

function animate(){
requestAnimationFrame(animate)
controls.update()
renderer.render(scene,camera)
}

animate()


function clearScene(){
while(scene.children.length>0){
scene.remove(scene.children[0])
}
}


function drawTruck(size){

let L=size[0]
let W=size[1]
let H=size[2]

const geo = new THREE.BoxGeometry(L,H,W)

const mat = new THREE.MeshBasicMaterial({
color:0x000000,
wireframe:true
})

const truck = new THREE.Mesh(geo,mat)

truck.position.set(L/2,H/2,W/2)

scene.add(truck)

}


function drawCargo(cargos){

cargos.forEach(c=>{

const geo = new THREE.BoxGeometry(
c.size[0],
c.size[2],
c.size[1]
)

const mat = new THREE.MeshBasicMaterial({
color:c.color
})

const cube = new THREE.Mesh(geo,mat)

cube.position.set(
c.x + c.size[0]/2,
c.z + c.size[2]/2,
c.y + c.size[1]/2
)

scene.add(cube)

})

}


function buildLegend(cargos){

let legendHTML=""
let used={}

cargos.forEach(c=>{

if(!used[c.color]){

legendHTML+=`
<div>
<span style="color:${c.color};font-size:20px;">■</span>
Rakomány
</div>
`

used[c.color]=true

}

})

document.getElementById("legend").innerHTML=legendHTML

}


function showNotLoaded(list){

if(list.length===0){
document.getElementById("notloaded").innerHTML=""
return
}

let html="<b>Nem fért be:</b><br>"

list.forEach(c=>{
html+=`<div style="color:${c.color}">■ ${c.missing} db</div>`
})

document.getElementById("notloaded").innerHTML=html

}


function addCargo(){

let html=`

<div class="border p-2 mt-2 flex gap-1 items-center">

<input placeholder="Hossz" class="border p-1 cargoL w-16">
<input placeholder="Szélesség" class="border p-1 cargoW w-16">
<input placeholder="Magasság" class="border p-1 cargoH w-16">
<input placeholder="Darab" class="border p-1 cargoC w-16">

<input type="color" class="cargoColor">

<button onclick="this.parentElement.remove()" class="bg-red-500 text-white px-2">X</button>

</div>

`

document
.getElementById("cargoList")
.insertAdjacentHTML("beforeend",html)

}


async function calculate(){

let truck=[
Number(tL.value),
Number(tW.value),
Number(tH.value)
]

let cargos=[]

let cargoDivs=document.querySelectorAll("#cargoList > div")

cargoDivs.forEach(div=>{

let cL=Number(div.querySelector(".cargoL").value)
let cW=Number(div.querySelector(".cargoW").value)
let cH=Number(div.querySelector(".cargoH").value)
let cC=Number(div.querySelector(".cargoC").value)
let color=div.querySelector(".cargoColor").value

cargos.push({
size:[cL,cW,cH],
count:cC,
color:color
})

})

let res=await fetch("/calculate",{

method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
truck:truck,
cargo:cargos
})

})

let data=await res.json()

clearScene()

drawTruck(truck)
drawCargo(data.positions)

buildLegend(data.positions)
showNotLoaded(data.not_loaded)

}
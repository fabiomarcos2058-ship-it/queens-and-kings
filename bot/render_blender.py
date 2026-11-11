# Roda dentro do Blender:
#   blender -b --factory-startup -P bot/render_blender.py -- modelo.glb saida.png 512 [girar_graus]
# Tira uma "foto" do modelo de cima e um pouco de frente (como na arena), com fundo transparente.
import bpy, sys, math
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
modelo, saida, res = args[0], args[1], int(args[2])
girar = float(args[3]) if len(args) > 3 else 0.0

bpy.ops.wm.read_factory_settings(use_empty=True)
cena = bpy.context.scene

ext = modelo.lower().rsplit('.', 1)[-1]
if ext in ('glb', 'gltf'):
    bpy.ops.import_scene.gltf(filepath=modelo)
elif ext == 'obj':
    try:
        bpy.ops.wm.obj_import(filepath=modelo)
    except AttributeError:
        bpy.ops.import_scene.obj(filepath=modelo)
else:
    raise SystemExit(f'Formato não suportado: {ext}')

malhas = [o for o in cena.objects if o.type == 'MESH']
if not malhas:
    raise SystemExit('Nenhuma malha no modelo')

if girar:
    raiz = bpy.data.objects.new('raiz', None)
    cena.collection.objects.link(raiz)
    for o in cena.objects:
        if o.parent is None and o is not raiz:
            o.parent = raiz
    raiz.rotation_euler[2] = math.radians(girar)
    bpy.context.view_layer.update()

pts = [o.matrix_world @ Vector(c) for o in malhas for c in o.bound_box]
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
centro = (mn + mx) / 2
tam = max((mx - mn).x, (mx - mn).y, (mx - mn).z)

# Câmera ortográfica inclinada 50 graus, olhando de frente (-Y) para o modelo
cam_dados = bpy.data.cameras.new('cam')
cam_dados.type = 'ORTHO'
cam_dados.ortho_scale = tam * 1.6
cam = bpy.data.objects.new('cam', cam_dados)
cena.collection.objects.link(cam)
ang = math.radians(50)
dist = tam * 5
cam.location = centro + Vector((0, -dist * math.cos(ang), dist * math.sin(ang)))
cam.rotation_euler = (centro - cam.location).to_track_quat('-Z', 'Y').to_euler()
cena.camera = cam

# Luz do sol vindo de cima à esquerda + céu claro
sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sol.data.energy = 3.0
sol.rotation_euler = (math.radians(45), 0, math.radians(-35))
cena.collection.objects.link(sol)
mundo = bpy.data.worlds.new('mundo')
mundo.use_nodes = True
mundo.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1)
mundo.node_tree.nodes['Background'].inputs[1].default_value = 0.9
cena.world = mundo

r = cena.render
r.engine = 'CYCLES'
cena.cycles.device = 'CPU'
cena.cycles.samples = 48
r.film_transparent = True
r.resolution_x = r.resolution_y = res
r.image_settings.file_format = 'PNG'
r.image_settings.color_mode = 'RGBA'

# Contorno escuro estilo desenho animado
r.use_freestyle = True
r.line_thickness = 1.6
camada = bpy.context.view_layer
camada.use_freestyle = True
linha = camada.freestyle_settings.linesets[0] if camada.freestyle_settings.linesets else camada.freestyle_settings.linesets.new('linha')
linha.linestyle.color = (0.12, 0.1, 0.1)

r.filepath = saida
bpy.ops.render.render(write_still=True)

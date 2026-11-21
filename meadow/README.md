# 83种花：Three.js花海散布

线上入口为 `/meadow/index.html`；原检查目录增加“进入三层花海”入口。此目录为源码与线上资源，不制作离线下载包。

## 分类和空间规则

`catalog.json` 逐项匹配 `collection/all83-reference-records.json` 的第三维标签，用原编号关联，未根据印象重新归类。

| 层 | 原分类 | 种数 | 默认株数 | 盛开基准高度 |
| --- | --- | ---: | ---: | ---: |
| ground | 伞形微花／碎花毯型 | 11 | 2400 | 0.48 |
| cluster | 丛生中花／群落型 | 57 | 720 | 1.2 |
| focus | 独生大花／焦点型 | 15 | 60 | 2.6 |

草地散布范围为32×32景观单位，根部均在y=0。底层抖动分层采样覆盖全场；中层使用二维Simplex Noise的两个频率叠加，按阈值及密度拒绝采样，并以同种邻近分布形成花丛；顶层设1.6单位根部最小间距。此处高度用于景观编排，并非物种的实测高度或生态共生建议。

每层先按15% Bud、35% Half、50% Full分配名额，用最大余数补齐整数，再随机打乱到每株。默认合计477／1113／1590株。名额太小时有最多一株的舍入差异；不是独立伯努利抽样，因此有限场景的比例更稳定。每种至少出现一次，若非零层的数量不足以容纳其全部种类则报错。

所有植株绕Y轴均匀旋转0—2π。尺寸乘数为`1 + Normal(0, 0.125)`，超出0.75—1.25的值重采样；不使用均匀分布，也不硬钳制到边界。用独立种子流控制位置、种类、阶段、变换，相同输入可完全复现。

## 接入

依次加载Three.js、`flower-scatter.js`、`model-loader.js`。已有Three.js场景可使用：

```js
const catalog = await fetch('./catalog.json').then(r => r.json());
const layout = FlowerScatter.plan(catalog, {
  seed: 'flower-meadow-83', width: 32, depth: 32,
  counts: { ground: 2400, cluster: 720, focus: 60 },
  heights: { ground: 0.48, cluster: 1.2, focus: 2.6 },
  clusterFrequency: 0.18, focusSpacing: 1.6
});
const templates = new Map();
async function loadTemplate(slug) {
  if (!templates.has(slug)) {
    templates.set(slug, MeadowModels.loadTemplate(THREE, slug, {
      baseUrl: './models/'
    }));
  }
  return templates.get(slug);
}
const meadow = await FlowerScatter.instantiate(THREE, layout, { loadTemplate });
scene.add(meadow.group);

// 替换散布时，只释放实例；模板可复用。
scene.remove(meadow.group);
meadow.dispose();
// 真正离开场景时，再释放共享模板。
for (const pending of templates.values()) (await pending).dispose();
```

`plan()`不依赖Three.js，返回每株的种类、层级、阶段、坐标、旋转、缩放。`instantiate()`按种类与阶段合批为InstancedMesh；`userData.plants[instanceId]`对应拾取植株的数据。传入的模板必须以根部y=0、盛开高度1归一化，三个阶段使用相同尺度。函数不拥有共享模板，`dispose()`仅释放实例缓冲。

Bud对应已验收微开苞的显示进度0（底层曲面进度0.25），Half为0.5、Full为1；包覆花苞的绿色网格不显示。三阶段使用不同几何，共享该种花现有的原图颜色／凹凸图集；未虚构三张独立生长阶段照片。

## 模型、构建和运行预算

模型从原83种曲面程序烘焙，其中黄花波斯菊使用独立原型中的专属形变公式。保留全部花头、花瓣及薄壳厚度，降低曲面细分与细小花蕊、枝叶细节。花海近距离精度低于原单朵检查页，可点击花朵打开精细模型。花朵没有使用平面贴图或Sprite。

`node meadow/bake-models.cjs`仅在源模型变动时重建83个压缩模型包；`python3 collection/build_collection.py`同步线上页面和脚本。包共约14.57MB，83种×3个姿态。颜色图集使用SRGB，凹凸图集使用线性空间；材质为MeshStandardMaterial。两种图集均关闭自动mipmap，使用线性过滤，防止远距离采样把相邻花瓣、绿色与空白图块混色；真实GPU中的远景纹理闪烁仍需视觉核对。

场景提供1590／3180／6360株密度，默认约2300万三角面；实际统计显示在画面下方。场景只在视角、布局或可见性变化时重绘，限制像素比，底层花不投射阴影。实例化减少提交次数，但不减少几何处理量；大量花簇仍有成本。模型加载需要支持`DecompressionStream('gzip')`的浏览器。

## 验证与限制

- `verify-scatter.cjs`：83种分类映射、空间分层、阶段名额、种子复现、旋转直方图、高斯方差和范围、焦点间距、有限次拒绝采样、真实实例矩阵和阶段材质。
- `verify-meadow-assets.cjs`：83种／249姿态的坐标、法线、原图绑定、根部归一化和阶段差异。
- `verify-meadow-ui.cjs`：执行实际发布脚本并加载真实模型，检查密度、种子、分层、视角、资源释放和WebGL不可用提示；仅DOM与GPU渲染器替换为测试对象。
- `node tests/verify-all.cjs`：包含原12组与新增3组完整回归。
- 软件投影抽查黄花波斯菊、李叶绣线菊、桔梗、木香花、西番莲、双色酢浆草的三阶段，并检查默认布局坐标图。

当前预览浏览器无法创建WebGL上下文，因此未完成GPU着色、真实帧率及整片花海的视觉验收；不把软件投影或替代渲染器测试等同于GPU运行。

参考接口：[Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)、[Three.js SimplexNoise](https://threejs.org/docs/pages/SimplexNoise.html)。原始照片来源及许可保留在各花朵检查页。

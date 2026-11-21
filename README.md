# 风过春野 · Gesture Meadow

张开手掌扫过草坪，花朵会沿轨迹绽放。可以用另一只手移动视角，点击一朵花查看它的三维开花动画和介绍。右上角的镜像预览会显示双手骨架、最近两秒的掌心轨迹和开花状态。

## 本地启动

在项目根目录用 Python 3 启动静态服务：

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

在浏览器访问 [互动花海](http://localhost:8000/meadow/) 或 [83 种花朵图鉴](http://localhost:8000/flowers/)。已有可运行的网页、图鉴和手势模型。点击「开启手势」后允许摄像头访问即可体验，也可以按住鼠标在草坪上拖动。

## 代码与验证

花海源码在 `meadow/`，图鉴与花型构建代码在 `collection/`，完整静态网站在 `dist/`。将整个 `dist/` 部署到 HTTPS 静态服务即可在线体验。照片署名、素材说明和历史版本随项目保留。

在仓库根目录用 Node.js 验证当前交互：

```sh
node tests/verify-meadow-hand-input.cjs
node tests/verify-dual-hand-meadow.cjs
node tests/verify-hand-preview.cjs
node tests/verify-hillside-ribbon.cjs
node tests/verify-spring-field.cjs
```

这些测试使用模拟输入。实际摄像头的捕捉范围和光线效果可在手势预览中检查。

## 历史版本开发记录

# 花开实验室 · 83种线上检查目录

当前版本保留已验收34种，新增49种（44种单瓣／扁平型、5种重瓣／多层型）。

V9增加三层花海与可复用Scatter脚本：`dist/meadow/index.html`，默认3180株、83种花，详见 [meadow/README.md](meadow/README.md)。原单朵动画保持V8的微开苞起点。

V8 将全部83种线上动画的起点统一为绿色包覆已退去的微开苞。首次打开、重置、拖到0%和盛开后再次播放均使用此起点；50%半开与100%盛开的花瓣几何保持原样。实现和验证范围见 [openbud-validation.md](docs/openbud-validation.md)。

- 全部目录：`dist/flowers/index.html`
- 本轮49种：`dist/flowers/remaining49.html`（编号35—83，逐一检查）
- 已验收杯状26种：`dist/flowers/cup26.html`
- 原12种基准：`dist/flowers/baseline12.html`

构建完整线上版：`python3 collection/build_collection.py`。整体验证：`node tests/verify-all.cjs`。
花瓣采用有厚度的曲面、原图物理材质和连续三阶段动画。参考范围与验证限制见 [remaining49-validation.md](docs/remaining49-validation.md)。本轮不生成新离线下载包。

以下为最初黄花波斯菊原型的历史说明；修改完整目录时应使用上面的构建入口。

# 黄花波斯菊 · 开花实验 V1.1

以「十二类典型图片_候选材料包」的单瓣／扁平型-黄花波斯菊.jpg 为参考，使用 Three.js 曲面建模制作一朵可控制开合的花。

## 使用

打开 `dist/index.html`，点击播放，或拖动进度条。支持花苞、半开、盛开三个定位点，拖动旋转、滚轮/双指缩放，以及斜视、正面、侧面切换。运行依赖和参考照片已内嵌，无需联网或安装。

修改 `prototype.html` 后运行 `python3 build.py`，生成单文件 HTML。这里的八片“花瓣”对应八片舌状花。原图用于视觉参照，模型未从照片自动扫描恢复。

## 依据与限制

- 原图有盛开主花、左上闭合花苞、右下露瓣花头，不能证明同一朵花的完整三个阶段。
- 半开姿态、隐藏结构与运动路径为建模推定。动画时间不是实际生长时间。
- 几何使用八片宽舌状花、密集突起的管状花盘、总苞片、茎与简化叶片；物种资料记载舌状花通常为 7–10 片。
- 未通过逐瓣 ±10° 测量或完整三阶段生物学验收。此版本适合先验证动画和交互方向，不作为植物学模拟结果。
- 当前预览浏览器禁用了 WebGL，实机 GPU 效果、阴影和帧率尚未验收。已经完成 JS 语法检查，以及 11 个进度位置的坐标/法线有效性、三个关键状态、重置、播放/暂停、视角切换逻辑检查（Node 中使用真实 Three.js 几何和替代渲染器）。四个姿态经过独立软件投影检查，该检查不能替代 WebGL 渲染验收。

## 素材与许可

照片：Annika Lindqvist，iNaturalist #26247862，依原材料包记录为 CC BY，原图未修改。
https://www.inaturalist.org/photos/26247862
https://creativecommons.org/licenses/by/

原始图片 SHA-256：fe9ec5207d18109daa5d1ed0b2513d44e07386a0b0b52af7d459cf0172d0c4ca

植物学参考：Kew, Cosmos sulphureus。
https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:198368-1/general-information

Three.js 0.160.1：MIT，见 assets/THREE-LICENSE.txt。为便于单文件离线运行，此原型保留了该版本 UMD 构建；正式集成可迁移至 ES Modules。

## V1.1 花瓣轮廓调整

根据原照片修正中段过宽导致的连续裙边：花瓣根部较窄，上部逐渐展开，瓣端圆肩独立，保留细齿。相邻花瓣只在花心遮挡的根部收拢，开放后的外轮廓可分辨；加入小幅高度与扭转差异。半开曲面同步适配，花苞和原有交互保持。

运行 `node tests/verify-geometry.cjs` 可检查 11 个进度位置的顶点与法线、关键状态与播放控制，以及盛开时八片舌状花外侧的投影间隙。间隙阈值是本原型的视觉验收规则，不是植物学测量标准。此回归检查在修改前因相邻花瓣重叠失败，修改后通过。

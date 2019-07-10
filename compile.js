// 扫描模板中所有依赖并创建更新函数和watcher

class Compile {
  constructor(el, vm) {
    // el是宿主元素或其选择器
    // vm当前Vue实例
    this.$vm = vm;
    this.$el = document.querySelector(el); // 默认选择器


    if (this.$el) {
      // 将dom节点转换为Fragment提高执行效率
      this.$fragment = this.node2Fragment(this.$el);
      // 执行编译
      this.compile(this.$fragment);
      // 将生成的结果追加至宿主元素
      this.$el.appendChild(this.$fragment);
    }
  }

  node2Fragment(el) {
    // 创建一个新的Fragment
    const fragment = document.createDocumentFragment();
    let child;
    // 将原生节点拷贝至fragment
    while ((child = el.firstChild)) {
      // appendChild是移动操作
      fragment.appendChild(child);
    }
    return fragment;
  }

  // 编译指定片段
  compile(el) {
    let childNodes = el.childNodes;
    Array.from(childNodes).forEach(node => {
      // 判断node类型，做响应处理
      if (this.isElementNode(node)) {
        this.compileElement(node);
        // 元素节点要识别h-xx或@xx
      } else if (this.isTextNode(node) && /\{\{(.*)\}\}/.test(node.textContent)) {
        // 文本节点，只关心{{xx}}格式
        this.compileText(node, RegExp.$1); // RegExp.$1匹配内容
      }
      // 遍历可能存在的子节点
      if (node.childNodes && node.childNodes.length) {
        this.compile(node);
      }
    })
  }

  // 编译元素节点
  compileElement(node) {
    // console.log('编译元素节点');

    // <div k-text="test" @click="onClick">
    const attrs = node.attributes;
    Array.from(attrs).forEach(attr => {
      // 规定指令 k-text="test" @click="onClick"
      const attrName = attr.name;
      const exp = attr.value;
      if (this.isDirective(attrName)) {
        // 指令
        const dir = attrName.substr(2);
        this[dir] && this[dir](node, this.$vm, exp)
      } else if (this.isEventDirective(attrName)) {
        // 事件
        const dir = attrName.substr(1);
        this.eventHandle(node, this.$vm, exp, dir);
      }
    })
  }

  compileText(node, exp) {
    // console.log('编译文本节点');
    this.text(node, this.$vm, exp);
  }

  isDirective(attr) {
    return attr.indexOf('h-') == 0;
  }

  isEventDirective(attr) {
    return attr.indexOf('@') == 0;
  }

  // 文本更新
  text(node, vm, exp) {
    this.update(node, vm, exp, 'text');
  }
  // 处理html
  html(node, vm, exp) {
    this.update(node, vm, exp, 'html');
  }
  // 双向绑定
  model(node, vm, exp) {
    this.update(node, vm, exp, 'model');

    const val = vm.exp;
    node.addEventListener('input', e => {
      vm[exp] = e.target.value;
    })
  }

  // 更新
  update(node, vm, exp, dir) {
    let updaterFn = this[dir + 'Updater'];
    updaterFn && updaterFn(node, vm[exp]); // 执行更新，get
    new Watcher(vm, exp, function (value) {
      updaterFn && updaterFn(node, value);
    })
  }

  textUpdater(node, value) {
    node.textContent = value;
  }
  htmlUpdater(node, value) {
    node.innerHTML = value;
  }
  modelUpdater(node, value) {
    node.value = value;
  }

  eventHandle(node, vm, exp, dir) {
    let fn = vm.$options.methods && vm.$options.methods[exp];
    if (dir && fn) {
      node.addEventListener(dir, fn.bind(vm), false);
    }
  }

  isElementNode(node) {
    return node.nodeType == 1; //元素节点
  }
  isTextNode(node) {
    return node.nodeType == 3; //文本节点
  }
}
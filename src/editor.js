var registerDiv = document.getElementById("registers");
var labelsDiv = document.getElementById("labels");
var constantsDiv = document.getElementById("constants");
var dataDiv = document.getElementById("data");
var memoryDiv = document.getElementById("memory");

// Editable window
var codeMirrorEditor =
    CodeMirror.fromTextArea(document.getElementById('editorWindow'), {
      lineNumbers : true,
      value : "",
    })

// Fires whenever the editable window changes
codeMirrorEditor.on('change', async function(cMirror) {
  var source_code = cMirror.getValue();
  // codeMirrorPretty.setValue());
  //  Set content of prettyWindow to the pretty printed code
  var code = await parse_and_pretty_print(source_code);
  document.getElementById("prettyPretty").innerHTML = code;
});

// Load parser
const Parser = window.TreeSitter;
async function initialize_parser() {
  await Parser.init();
  const parser = new Parser();
  const L = await Parser.Language.load(L_wasm);
  parser.setLanguage(L);
  return parser;
}

// Pretty print input sourcecode
async function parse_and_pretty_print(source_code) {
  let parser = await initialize_parser();
  let tree = await parser.parse(source_code);
  if (tree.rootNode.toString().includes("ERROR")) {
    return "- ERROR -";
  }
  let program = compile(tree);
  // parse_byte_code from pretty.js pretty prints the byte_code
  var pretty_printer = new PrettyPrinter(program);
  return pretty_printer.print_program({registers : {'$!' : -1}});
}

async function parse_and_read(source_code) {
  let parser = await initialize_parser();
  let tree = await parser.parse(source_code);
  // p_source from pretty.js pretty prints the code using the input parse tree
  return compile(tree);
}
async function run_all() {
  var source_code = await codeMirrorEditor.getValue();

  let program = await parse_and_read(source_code);
  console.log(program)
  var VM = new VirtualMachine(program);
  execute_all(VM);
}

async function pauseUntilEvent(clickListenerPromise) {
  await clickListenerPromise
}

async function createClickListenerPromise(target) {
  return new Promise((resolve) => target.addEventListener('click', resolve))
}

async function debug() {
  document.querySelector('#debugbutton').disabled = true;
  document.querySelector('#stepbutton').disabled = false;
  var source_code = await codeMirrorEditor.getValue();
  let program = await parse_and_read(source_code);
  var VM = new VirtualMachine(program);

  while (true) {
    await pauseUntilEvent(
        createClickListenerPromise(document.querySelector('#stepbutton')))
    if (execute_step(VM) == -1) {
      document.querySelector('#debugbutton').disabled = false;
      document.querySelector('#stepbutton').disabled = true;
      return;
    }
  }
}

function execute_all(VM) {
  while (true) { // step
    if (execute_step(VM) == -1) {
      break;
    }
  }
}

function execute_step(VM) {
  if (VM.state.registers['$!'] >= VM.program.instructions.length) {
    console.log("EOF");
    return -1;
  }

  VM.execute_bytecode()
  registerDiv.innerHTML =
      "Registers: " +
      JSON.stringify(VM.state.registers, undefined, 2).replaceAll("\"", "");
  labelsDiv.innerHTML =
      "Labels: " +
      JSON.stringify(VM.state.labels, undefined, 2).replaceAll("\"", "");
  constantsDiv.innerHTML =
      "Constants: " +
      JSON.stringify(VM.state.constants, undefined, 2).replaceAll("\"", "");
  dataDiv.innerHTML =
      "Data: " +
      JSON.stringify(VM.state.data, undefined, 2).replaceAll("\"", "");

  var pretty_printer = new PrettyPrinter(VM.program);
  document.getElementById("prettyPretty").innerHTML =
      pretty_printer.print_program(VM.state);

  rows = ""
  for (let i = 0; i < VM.state.memory.length; i += 10) {
    let row = ""
    for (let j = i; j < VM.state.memory.length && j < i + 10; j += 1) {
      row += `<td>${toHex(VM.state.memory[j])}</td>`
    }
    rows += `<tr>${row}</tr>`
  }
  memoryDiv.innerHTML = `<table>${rows}</table>`

  function toHex(d) {
    return ("0" + (Number(d).toString(16))).slice(-2).toUpperCase()
  }
}

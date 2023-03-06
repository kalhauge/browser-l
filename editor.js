//Editable window
var codeMirrorEditor = CodeMirror.fromTextArea(document.getElementById('editorWindow'), {
    lineNumbers: true,
    value: ""
})

//Non editable display window
var codeMirrorPretty = CodeMirror.fromTextArea(document.getElementById('prettyWindow'), {
    lineNumbers: true,
    value: "",
    readOnly: true
})

//Fires whenever the editable window changes
codeMirrorEditor.on('change',async function(cMirror){
    var source_code = cMirror.getValue();
    codeMirrorPretty.setValue(await parse_and_pretty_print(source_code));
});

//Load parser
const Parser = window.TreeSitter;
async function initialize_parser() {
  await Parser.init();
  const parser = new Parser();
  const Javascript = await Parser.Language.load('tree-sitter-l.wasm');
  parser.setLanguage(Javascript);
  return parser;
}

//Pretty print input sourcecode
async function parse_and_pretty_print(source_code){
    let parser = await initialize_parser();
    let tree = await parser.parse(source_code)

    //p_source from pretty.js pretty prints the code using the input parse tree
    return await p_source(tree);
}

async function parse_and_read(source_code){
    let parser = await initialize_parser();
    let tree = await parser.parse(source_code)
    console.log(tree.rootNode.childCount);

    //p_source from pretty.js pretty prints the code using the input parse tree
    read_program(tree);
}
async function run_all(){
    var source_code = await codeMirrorEditor.getValue();
    await parse_and_read(source_code);
    execute_all(state, program);
}

async function pauseUntilEvent (clickListenerPromise) {
    await clickListenerPromise
  }


async function createClickListenerPromise (target) {
    return new Promise((resolve) => target.addEventListener('click', resolve))
}

async function debug(){
    document.querySelector('#debugbutton').disabled = true;
    document.querySelector('#stepbutton').disabled = false;
    var source_code = await codeMirrorEditor.getValue();
    await parse_and_read(source_code);

    while(true){
        await pauseUntilEvent(createClickListenerPromise(document.querySelector('#stepbutton')))
        if(execute_step(state, program) == -1){
            document.querySelector('#debugbutton').disabled = false;
            document.querySelector('#stepbutton').disabled = true;
            return;
        }
    }
}

function execute_all(state, program){
    while(true){ //step
        if (execute_step(state, program) == -1) {
            break;
        }
    }
}

function execute_step(state, program){
    if(state.registers['$!'] >= program.length){
        console.log("EOF");
        return -1;
    }
    handle_statement(program[state.registers['$!']])
    state.registers['$!']++;
    console.log("registers: ",JSON.stringify(state.registers, undefined, 2)); 
    console.log("labels: ",JSON.stringify(state.labels, undefined, 2))
    console.log("conts: ",JSON.stringify(state.cs, undefined, 2))
    console.log("data: ",JSON.stringify(state.data, undefined, 2))
    console.log("mem", JSON.stringify(state.memory[111], undefined, 2));
}

# Prepare the browser capture: a copy of the built demo with an input hook, and the test bot wrapped for the page.
# Run from the work directory; writes study.html and bot-browser.js there.
import os
root=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../..'))
s=open(os.path.join(root,'ICARUS-demo.html')).read()
END='})();\n/*! Bundled license'
assert s.count(END)==1
hook='globalThis.__study={setInput(f){tf=f},get ft(){return ft},set ft(v){ft=v}};\n'
open('study.html','w').write(s.replace(END,hook+END))
b=open(os.path.join(root,'qa/bot.cjs')).read()
open('bot-browser.js','w').write('(function(){const module={exports:{}};\n'+b+'\nwindow.__bot=module.exports;})();')
print('ok')

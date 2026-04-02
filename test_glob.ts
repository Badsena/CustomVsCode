import * as glob from 'glob';
console.log('Type of glob:', typeof glob);
console.log('Keys of glob:', Object.keys(glob));
console.log('Type of glob.sync:', typeof (glob as any).sync);
if ((glob as any).default) {
    console.log('Type of glob.default:', typeof (glob as any).default);
    console.log('Type of glob.default.sync:', typeof (glob as any).default.sync);
}

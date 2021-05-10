import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as RTE from 'fp-ts/ReaderTaskEither'

// -----------------------------------------
// effetto del nostro programma
// -----------------------------------------

interface Effect<R, A> extends RTE.ReaderTaskEither<R, Error, A> {}

// -----------------------------------------
// helpers
// -----------------------------------------

const chainW: <R2, A, B>(
  f: (a: A) => Effect<R2, B>
) => <R1>(ma: Effect<R1, A>) => Effect<R1 & R2, B> = RTE.chainW

const asksEffectW = <R1, R2, A>(
  f: (r1: R1) => Effect<R2, A>
): Effect<R1 & R2, A> => (r) => f(r)(r)

// -----------------------------------------
// APIs
// -----------------------------------------

interface ReadFile {
  readonly readFile: (filename: string) => Effect<unknown, string>
}

const readFile = (filename: string) =>
  asksEffectW((r: ReadFile) => r.readFile(filename))

interface WriteFile {
  readonly writeFile: (filename: string, data: string) => Effect<unknown, void>
}

const writeFile = (filename: string, data: string) =>
  asksEffectW((r: WriteFile) => r.writeFile(filename, data))

interface Logger {
  readonly log: <A>(a: A) => Effect<unknown, void>
}

const log = <A>(a: A) => asksEffectW((r: Logger) => r.log(a))

// -----------------------------------------
// programma
// -----------------------------------------

const modifyFile = (filename: string, f: (s: string) => string) =>
  pipe(
    readFile(filename),
    chainW((s) => writeFile(filename, f(s)))
  )

const program6 = pipe(
  readFile('-.txt'),
  chainW(log),
  chainW(() => modifyFile('file.txt', (s) => s + '\n// eof')),
  chainW(() => readFile('file.txt')),
  chainW(log)
)

// -----------------------------------------
// istanze per ReadFile, Console, WriteFile
// -----------------------------------------

import * as fs from 'fs'
import * as E from 'fp-ts/Either'
import * as C from 'fp-ts/Console'

const ReadFile: ReadFile = {
  readFile: (filename) => () => () =>
    new Promise((resolve) =>
      fs.readFile(filename, { encoding: 'utf-8' }, (err, s) => {
        if (err !== null) {
          resolve(E.left(err))
        } else {
          resolve(E.right(s))
        }
      })
    )
}

const WriteFile: WriteFile = {
  writeFile: (filename: string, data: string) => () => () =>
    new Promise((resolve) =>
      fs.writeFile(filename, data, (err) => {
        if (err !== null) {
          resolve(E.left(err))
        } else {
          resolve(E.right(undefined))
        }
      })
    )
}

const Logger: Logger = {
  log: (a) => () => TE.fromIO(C.log(a))
}

// dependency injection
program6({ ...ReadFile, ...WriteFile, ...Logger })().then(console.log)

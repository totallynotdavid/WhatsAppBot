# Recomendaciones

Estas son guías basadas en los videos de [Steve (Builder.io)](https://www.youtube.com/@Steve8708/videos).

## Concurrencia de funciones independientes

### Recomendado

Si no hay demasiadas funciones independientes con await.

```javascript
async function getPageData() {
    const results = await Promise.allSettled([fetchUser(), fetchProduct()]);

    const [user, product] = handle(results);
}
```

### No recomendado

```javascript
async function getPageData() {
	const user = await fetchuser(), // Esto toma 0,5 segundos
	const product = await fetchProduct(), // Esto toma otros 0,5 segundos
	// Total = 1 segundo de ejecución

	// Otro enfoque
	/*
	try {
		const [user, products] = await Promise.all([
			fetchUser(),
			fetchProduct(),
		])
	} catch (err) {
		// Solo se llamaría por uno de los errores
	}
	*/
}
```

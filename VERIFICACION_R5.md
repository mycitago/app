
# R5 · Verificación de abuso y seguridad

- [ ] Cita no completada: `create_review_request` devuelve `appointment_not_completed`.
- [ ] Token inventado: formulario público lo rechaza.
- [ ] Rating 0: `invalid_rating`.
- [ ] Rating 6: `invalid_rating`.
- [ ] Comentario >1200: `comment_too_long`.
- [ ] Enviar la misma cita dos veces: bloqueado.
- [ ] Reutilizar el mismo token: bloqueado.
- [ ] Cambiar cita a cancelada antes de enviar: `appointment_not_completed`.
- [ ] Reseña interna no verificada no aparece en `public_business_reviews_verified`.
- [ ] Reseña de negocio A no aparece al consultar negocio B.
- [ ] Admin de negocio A no puede responder reseña del negocio B.

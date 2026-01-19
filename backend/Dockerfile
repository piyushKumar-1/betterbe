# Build stage
FROM rust:latest AS builder

WORKDIR /app

# Install dependencies for sqlx
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml Cargo.lock* ./

# Create a dummy main.rs to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies (this layer will be cached)
RUN cargo build --release && rm -rf src

# Copy actual source code
COPY src ./src
COPY migrations ./migrations

# Build the actual application
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/betterbe-api /usr/local/bin/betterbe-api

# Copy migrations for runtime execution
COPY --from=builder /app/migrations ./migrations

# Create non-root user
RUN useradd -m -u 1000 appuser
USER appuser

EXPOSE 3000

CMD ["betterbe-api"]


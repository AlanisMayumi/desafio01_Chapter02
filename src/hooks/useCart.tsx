import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<Stock>(`stock/${productId}`);
      const stockAmount = stockResponse.data.amount;

      const produtoCart = cart?.filter((p) => p.id === productId);
      const amount = produtoCart[0]?.amount + 1;
      if (stockAmount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (produtoCart.length > 0) {
        const itemsCart = cart.reduce((produtos, produto) => {
          if (produto.id === productId) {
            produto.amount += 1;
          }
          produtos.push(produto);
          return produtos;
        }, [] as Product[]);
        
        setCart([...itemsCart]);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(itemsCart));
      } else {
        const response = await api.get<Product>(`products/${productId}`);
        const product = { ...response.data, amount: 1 };

        setCart([...cart, product]);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, product])
        );
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const produtoRemover = cart.filter((item) => item.id === productId);

      if (produtoRemover.length > 0) {
        const items = cart.filter((item) => item.id !== productId);
        setCart(items);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(items));
      } else {
        throw Error();
      }
    } catch {
      return toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const stockResponse = await api.get<Stock>(`stock/${productId}`);
      const stockAmount = stockResponse.data.amount;

      if (stockAmount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const itemsCart = cart.reduce((produtos, produto) => {
        if (produto.id === productId) {
          produto.amount = amount;
        }
        produtos.push(produto);
        return produtos;
      }, [] as Product[]);
      
      setCart(itemsCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(itemsCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
